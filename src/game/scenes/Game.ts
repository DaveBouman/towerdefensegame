import { applyBoardLayout, computeBoardLayout, type BoardLayout } from '../board/boardLayout';
import { ArmorView } from '../board/ArmorView';
import { CardBoardView } from '../board/CardBoardView';
import { CardHandView } from '../board/CardHandView';
import { CardPileView } from '../board/CardPileView';
import { EnemyTargetView } from '../board/EnemyTargetView';
import { PlayerHealthView } from '../board/PlayerHealthView';
import { CardGameSession } from '../cardGame/domain/CardGameSession';
import { GAME_RULES, getCardDefinitionOrThrow } from '../cardGame/config/cardRegistry';
import type { SlotPosition } from '../cardGame/domain/types';
import { destroyCardTooltipController } from '../cardGame/presentation/tooltips/CardTooltipController';
import { destroyEnemyIntentTooltipController } from '../cardGame/presentation/tooltips/EnemyIntentTooltipController';
import { destroyEnemyPassiveTooltipController } from '../cardGame/presentation/tooltips/EnemyPassiveTooltipController';
import { preloadEnemyPassiveIcons } from '../cardGame/presentation/icons/preloadEnemyPassiveIcons';
import { CardGamePresenter } from '../cardGame/presentation/CardGamePresenter';
import { CardGameEventBus } from '../cardGame/events/CardGameEventBus';
import { CARD_GAME_EVENTS } from '../cardGame/events/cardGameEvents';
import { EventBus } from '../EventBus';
import { GAME_EVENTS } from '../events/gameEvents';
import { reseed } from '../random/rng';
import { Scene } from 'phaser';

const sameSlot = (a: SlotPosition, b: SlotPosition): boolean =>
    a.row === b.row && a.col === b.col;

export class Game extends Scene
{
    private session?: CardGameSession;
    private presenter?: CardGamePresenter;
    private boardView?: CardBoardView;
    private handView?: CardHandView;
    private enemyView?: EnemyTargetView;
    private playerView?: PlayerHealthView;
    private armorView?: ArmorView;
    private deckView?: CardPileView;
    private graveyardView?: CardPileView;
    private rerollModeActive = false;
    private turnResolving = false;
    private layout?: BoardLayout;
    private battleActive = false;
    private battleResolved = false;

    constructor ()
    {
        super('Game');
    }

    create (): void
    {
        void preloadEnemyPassiveIcons(this).then(() =>
        {
            this.registerListeners();
            EventBus.emit(GAME_EVENTS.SCENE_READY, this);
        });
    }

    private registerListeners (): void
    {
        EventBus.on(GAME_EVENTS.START_BATTLE, this.onStartBattle, this);
        EventBus.on(GAME_EVENTS.ATTACK, this.onAttack, this);
        EventBus.on(GAME_EVENTS.END_TURN, this.onEndTurn, this);
        EventBus.on(GAME_EVENTS.REROLL_BEGIN, this.onRerollBegin, this);
        EventBus.on(GAME_EVENTS.REROLL_CONFIRM, this.onRerollConfirm, this);
        EventBus.on(GAME_EVENTS.REROLL_CANCEL, this.onRerollCancel, this);
        CardGameEventBus.on(CARD_GAME_EVENTS.PILES_CHANGED, this.onPilesChanged, this);
        CardGameEventBus.on(CARD_GAME_EVENTS.REROLLS_CHANGED, this.onRerollsChanged, this);
        this.scale.on('resize', this.onResize, this);
    }

    private onStartBattle = (
        { enemyId, startHealth, deck, seed }:
        { enemyId: string; startHealth: number; deck: string[]; seed: number },
    ): void =>
    {
        if (this.battleActive)
        {
            this.endBattle();
        }

        this.startBattle(enemyId, startHealth, deck, seed);
    };

    private startBattle (enemyId: string, startHealth: number, deck: string[], seed: number): void
    {
        // Install this battle's deterministic RNG stream before any card is dealt.
        reseed(seed);

        const { width, height } = this.scale;
        this.layout = computeBoardLayout(width, height);
        const layout = this.layout;
        this.rerollModeActive = false;
        this.turnResolving = false;
        this.battleResolved = false;
        this.session = new CardGameSession(enemyId, startHealth, deck);

        this.handView = new CardHandView(this, layout, [ ...this.session.getHand() ], {
            onDragMove: (worldX, worldY) =>
            {
                this.boardView?.highlightHandPlacement(worldX, worldY);
            },
            onDragEnd: (handIndex, worldX, worldY) =>
            {
                return this.onCardDropped(handIndex, worldX, worldY);
            },
            onPlaced: () =>
            {
                this.handView?.syncHand(this.session!.getHand());
            },
        }, () => !(this.boardView?.isDragging() ?? false) && !this.rerollModeActive, (selectedCount) =>
        {
            this.emitRerollState(selectedCount);
        });

        this.boardView = new CardBoardView(this, layout, this.session.board, {
            canDrag: () => !(this.handView?.isDragging() ?? false) && !this.rerollModeActive,
            onDragMove: (fromSlot, worldX, worldY) =>
            {
                this.boardView?.highlightBoardDrag(fromSlot, worldX, worldY);
            },
            onDragEnd: (fromSlot, worldX, worldY) =>
            {
                return this.onBoardCardDropped(fromSlot, worldX, worldY);
            },
        }, {
            canSelect: () => this.session?.canEditBoard() ?? false,
            onSelect: (slot) =>
            {
                if (!this.session?.setChainStartSlot(slot))
                {
                    return;
                }

                this.boardView?.setChainStartSlot(slot);
                this.emitAttackReadiness();
            },
        });

        this.playerView = new PlayerHealthView(this, layout, this.session.getPlayer());
        this.enemyView = new EnemyTargetView(this, layout, this.session.getEnemy());
        this.enemyView.setEnemyLabel(this.session.getEnemyDefinition().label);
        this.enemyView.setEnemyPassives(this.session.getEnemyDefinition().passives);
        this.armorView = new ArmorView(this, layout, 0);
        this.deckView = new CardPileView(this, layout, layout.deckX, layout.deckY, 'Deck', 'deck');
        this.graveyardView = new CardPileView(this, layout, layout.graveyardX, layout.graveyardY, 'Graveyard', 'graveyard');
        this.deckView.setClickHandler(() => this.openPileView('deck'));
        this.graveyardView.setClickHandler(() => this.openPileView('graveyard'));
        this.syncPileViews();

        this.session.placeFieldBoost();
        this.boardView.syncFromBoard(this.session.board);
        this.boardView.setBlockedSlots(
            this.session.getSilencedSlots(),
            this.session.getBombDisabledSlots(),
        );
        this.boardView.setDampenedSlots(this.session.getDampenedSlots());

        this.presenter = new CardGamePresenter(
            this,
            this.session,
            this.boardView,
            this.handView,
            this.enemyView,
            this.playerView,
            this.armorView,
        );
        this.presenter.bind();

        const initialIntent = this.session.getQueuedEnemyTurn();

        if (initialIntent)
        {
            this.enemyView.showIntent(initialIntent);
        }

        this.battleActive = true;
        this.emitAttackReadiness();
        this.emitRerollState();
    }

    private onResize = (gameSize: Phaser.Structs.Size): void =>
    {
        if (!this.layout || !this.boardView || !this.handView || !this.enemyView
            || !this.playerView || !this.armorView || !this.deckView || !this.graveyardView)
        {
            return;
        }

        this.layout = computeBoardLayout(gameSize.width, gameSize.height);
        applyBoardLayout(this.layout, {
            board: this.boardView,
            hand: this.handView.container,
            enemy: this.enemyView.container,
            player: this.playerView.container,
            armor: this.armorView.container,
            deck: this.deckView.container,
            graveyard: this.graveyardView.container,
        });
    };

    private endBattle (): void
    {
        this.session?.cancelAttack();
        this.session?.cancelEnemyTurn();
        this.presenter?.unbind();
        this.boardView?.destroy();
        this.handView?.destroy();
        this.enemyView?.destroy();
        this.playerView?.destroy();
        this.armorView?.destroy();
        this.deckView?.destroy();
        this.graveyardView?.destroy();
        destroyCardTooltipController();
        destroyEnemyPassiveTooltipController();
        destroyEnemyIntentTooltipController();
        this.presenter = undefined;
        this.boardView = undefined;
        this.handView = undefined;
        this.enemyView = undefined;
        this.playerView = undefined;
        this.armorView = undefined;
        this.deckView = undefined;
        this.graveyardView = undefined;
        this.session = undefined;
        this.battleActive = false;
        this.rerollModeActive = false;
    }

    private winBattle (): void
    {
        if (this.battleResolved || !this.session)
        {
            return;
        }

        this.battleResolved = true;
        const playerHealth = this.session.getPlayer().health;

        this.time.delayedCall(900, () =>
        {
            this.endBattle();
            EventBus.emit(GAME_EVENTS.BATTLE_WON, { playerHealth });
        });
    }

    private loseBattle (): void
    {
        if (this.battleResolved)
        {
            return;
        }

        this.battleResolved = true;

        this.time.delayedCall(900, () =>
        {
            this.endBattle();
            EventBus.emit(GAME_EVENTS.BATTLE_LOST);
        });
    }

    shutdown (): void
    {
        this.scale.off('resize', this.onResize, this);
        EventBus.off(GAME_EVENTS.START_BATTLE, this.onStartBattle, this);
        EventBus.off(GAME_EVENTS.ATTACK, this.onAttack, this);
        EventBus.off(GAME_EVENTS.END_TURN, this.onEndTurn, this);
        EventBus.off(GAME_EVENTS.REROLL_BEGIN, this.onRerollBegin, this);
        EventBus.off(GAME_EVENTS.REROLL_CONFIRM, this.onRerollConfirm, this);
        EventBus.off(GAME_EVENTS.REROLL_CANCEL, this.onRerollCancel, this);
        CardGameEventBus.off(CARD_GAME_EVENTS.PILES_CHANGED, this.onPilesChanged, this);
        CardGameEventBus.off(CARD_GAME_EVENTS.REROLLS_CHANGED, this.onRerollsChanged, this);
        this.endBattle();
    }

    private onPilesChanged = ({ deckSize, discardSize }: { deckSize: number; discardSize: number }): void =>
    {
        if (!this.session)
        {
            return;
        }

        this.deckView?.setCount(deckSize);
        this.graveyardView?.setCount(discardSize);
    };

    private syncPileViews (): void
    {
        if (!this.session)
        {
            return;
        }

        const { deckSize, discardSize } = this.session.getPileCounts();

        this.deckView?.setCount(deckSize);
        this.graveyardView?.setCount(discardSize);
    }

    private openPileView (kind: 'deck' | 'graveyard'): void
    {
        if (!this.session)
        {
            return;
        }

        const definitionIds = kind === 'deck'
            ? this.session.getDeckDefinitionIds()
            : this.session.getDiscardDefinitionIds();

        const cards = definitionIds.map((definitionId) =>
        {
            const definition = getCardDefinitionOrThrow(definitionId);

            return {
                definitionId,
                label: definition.label,
                power: definition.power,
                behaviorId: definition.behaviorId,
            };
        });

        EventBus.emit(GAME_EVENTS.PILE_VIEW_OPEN, {
            kind,
            title: kind === 'deck' ? 'Draw Pile' : 'Discard Pile',
            cards,
        });
    }

    private onAttack = (): void =>
    {
        if (!this.session || !this.presenter || this.turnResolving)
        {
            return;
        }

        if (this.rerollModeActive)
        {
            this.onRerollCancel();
        }

        const readiness = this.session.getAttackReadiness();

        if (!readiness.canAttack)
        {
            EventBus.emit(GAME_EVENTS.ATTACK_REJECTED, { reason: readiness.reason });
            return;
        }

        const chainStart = this.session.beginAttack();

        if (!chainStart)
        {
            EventBus.emit(GAME_EVENTS.ATTACK_REJECTED, { reason: 'no-cards-on-board' });
            return;
        }

        this.presenter.playAttack(chainStart, (sequence) =>
        {
            this.onAttackResolved(sequence);
        });
    };

    /**
     * After a chain resolves the board is kept in place so the next attack chains through
     * a longer, escalating sequence. Spends one energy, refills the hand, and — when energy
     * runs out — hands the turn to the enemy.
     */
    private onAttackResolved (sequence: import('../cardGame/domain/types').AttackSequence): void
    {
        if (!this.session || !this.boardView || !this.enemyView)
        {
            return;
        }

        this.session.completeAttack(sequence);
        this.session.spendEnergy();
        // Release the attack lock so cards can be added before the next attack.
        this.session.finishPlayerTurn();
        this.session.refillHand();

        this.boardView.syncFromBoard(this.session.board);
        this.boardView.setBlockedSlots(
            this.session.getSilencedSlots(),
            this.session.getBombDisabledSlots(),
        );
        this.boardView.setDampenedSlots(this.session.getDampenedSlots());
        this.handView?.syncHand(this.session.getHand());
        this.enemyView.setHealth(this.session.getEnemy());
        this.armorView?.setArmor(this.session.getPlayer().shield);
        this.syncPileViews();

        if (this.session.isEnemyDefeated())
        {
            this.enemyView.clearIntent();
            this.emitAttackReadiness();
            this.winBattle();
            return;
        }

        this.emitAttackReadiness();

        if (!this.session.hasEnergy())
        {
            this.onEndTurn();
        }
    }

    private onEndTurn = (): void =>
    {
        if (!this.session || !this.boardView || this.turnResolving)
        {
            return;
        }

        if (this.session.isAttackInProgress() || this.session.isEnemyTurnInProgress())
        {
            return;
        }

        if (this.session.isEnemyDefeated() || this.session.isPlayerDefeated())
        {
            return;
        }

        if (this.rerollModeActive)
        {
            this.onRerollCancel();
        }

        this.turnResolving = true;
        this.emitAttackReadiness();

        const graveyardTarget = this.graveyardView?.getReceivePosition() ?? { x: 0, y: 0 };

        this.boardView.animateCardsToGraveyard(graveyardTarget.x, graveyardTarget.y, () =>
        {
            this.resolveEnemyPhase();
        });
    };

    private resolveEnemyPhase (): void
    {
        if (!this.session || !this.boardView || !this.enemyView)
        {
            return;
        }

        this.session.clearBoard();
        this.session.tickDampenField();
        this.boardView.syncFromBoard(this.session.board);
        this.boardView.setBlockedSlots(
            this.session.getSilencedSlots(),
            this.session.getBombDisabledSlots(),
        );
        this.boardView.setDampenedSlots(this.session.getDampenedSlots());
        this.graveyardView?.pulse();
        this.syncPileViews();
        this.enemyView.setHealth(this.session.getEnemy());
        this.armorView?.setArmor(this.session.getPlayer().shield);

        if (this.session.isEnemyDefeated())
        {
            this.enemyView.clearIntent();
            this.session.finishPlayerTurn();
            this.turnResolving = false;
            this.emitAttackReadiness();
            this.winBattle();
            return;
        }

        const enemyTurn = this.session.beginEnemyTurn();

        if (!enemyTurn)
        {
            this.session.finishPlayerTurn();
            this.turnResolving = false;
            this.emitAttackReadiness();
            return;
        }

        this.enemyView.showIntent(enemyTurn, 'executing');

        this.presenter?.playEnemyTurn(enemyTurn, () =>
        {
            this.playerView?.setHealth(this.session!.getPlayer());
            this.enemyView?.setHealth(this.session!.getEnemy());

            if (this.session!.isPlayerDefeated())
            {
                this.session!.finishPlayerTurn();
                this.turnResolving = false;
                this.emitAttackReadiness();
                this.loseBattle();
                return;
            }

            if (this.session!.isEnemyDefeated())
            {
                this.enemyView?.clearIntent();
                this.session!.finishPlayerTurn();
                this.turnResolving = false;
                this.emitAttackReadiness();
                this.winBattle();
                return;
            }

            const nextIntent = this.session!.getQueuedEnemyTurn();

            if (nextIntent)
            {
                this.enemyView?.showIntent(nextIntent);
            }
            else
            {
                this.enemyView?.clearIntent();
            }

            this.handView?.syncHand(this.session!.getHand());
            this.armorView?.setArmor(this.session!.getPlayer().shield);
            this.session!.placeFieldBoost();
            this.boardView?.syncFromBoard(this.session!.board);
            this.boardView?.setBlockedSlots(
                this.session!.getSilencedSlots(),
                this.session!.getBombDisabledSlots(),
            );
            this.boardView?.setDampenedSlots(this.session!.getDampenedSlots());
            this.syncPileViews();
            this.session!.finishPlayerTurn();
            this.turnResolving = false;
            this.emitAttackReadiness();
        });
    }

    private onRerollsChanged = (): void =>
    {
        this.emitRerollState();
    };

    private onRerollBegin = (): void =>
    {
        if (!this.session?.canReroll())
        {
            return;
        }

        this.rerollModeActive = true;
        this.handView?.setRerollMode(true);
        this.emitRerollState();
    };

    private onRerollCancel = (): void =>
    {
        this.rerollModeActive = false;
        this.handView?.setRerollMode(false);
        this.emitRerollState();
    };

    private onRerollConfirm = (): void =>
    {
        if (!this.session?.canReroll() || !this.handView)
        {
            return;
        }

        const indices = this.handView.getSelectedHandIndices();

        if (indices.length === 0)
        {
            return;
        }

        if (this.session.rerollHandCards(indices))
        {
            this.rerollModeActive = false;
            this.handView.setRerollMode(false);
            this.handView.syncHand(this.session.getHand());
            this.syncPileViews();
            this.emitAttackReadiness();
        }

        this.emitRerollState();
    };

    private emitRerollState (selectedCount?: number): void
    {
        if (!this.session)
        {
            return;
        }

        EventBus.emit(GAME_EVENTS.REROLL_STATE, {
            rerollsRemaining: this.session.getRerollsRemaining(),
            maxRerollsPerFight: GAME_RULES.fightRerollsPerFight,
            canReroll: this.session.canReroll(),
            rerollModeActive: this.rerollModeActive,
            selectedCount: selectedCount ?? this.handView?.getRerollSelectionCount() ?? 0,
        });
    }

    private emitAttackReadiness (): void
    {
        if (!this.session)
        {
            return;
        }

        this.enemyView?.setHealth(this.session.getEnemy());
        EventBus.emit(GAME_EVENTS.CARD_ATTACK_READY, this.session.getAttackReadiness());
        this.emitTurnState();
    }

    private emitTurnState (): void
    {
        if (!this.session)
        {
            return;
        }

        const canEndTurn = !this.turnResolving
            && !this.session.isAttackInProgress()
            && !this.session.isEnemyTurnInProgress()
            && !this.session.isEnemyDefeated()
            && !this.session.isPlayerDefeated();

        EventBus.emit(GAME_EVENTS.TURN_STATE, {
            energy: this.session.getEnergy(),
            maxEnergy: this.session.getMaxEnergy(),
            canEndTurn,
        });
    }

    private onCardDropped (handIndex: number, worldX: number, worldY: number): boolean
    {
        if (!this.session || !this.boardView || !this.session.canEditBoard() || this.turnResolving)
        {
            this.boardView?.clearHighlight();
            return false;
        }

        this.boardView.clearHighlight();

        const slot = this.boardView.findSlotAt(worldX, worldY);

        if (!slot)
        {
            return false;
        }

        if (!this.session.placeCardFromHand(handIndex, slot))
        {
            return false;
        }

        this.boardView.syncFromBoard(this.session.board);
        this.emitAttackReadiness();

        return true;
    }

    private onBoardCardDropped (fromSlot: SlotPosition, worldX: number, worldY: number): boolean
    {
        if (!this.session || !this.boardView || !this.handView || !this.session.canEditBoard() || this.turnResolving)
        {
            this.boardView?.clearHighlight();
            return false;
        }

        this.boardView.clearHighlight();

        if (this.handView.containsPoint(worldX, worldY))
        {
            if (!this.session.removeCardFromBoard(fromSlot))
            {
                return false;
            }

            this.boardView.syncFromBoard(this.session.board);
            this.handView.syncHand(this.session.getHand());
            this.emitAttackReadiness();

            return true;
        }

        const targetSlot = this.boardView.findSlotAt(worldX, worldY);

        if (!targetSlot || sameSlot(fromSlot, targetSlot))
        {
            return false;
        }

        if (this.session.board.isEmpty(targetSlot))
        {
            if (!this.session.moveCardOnBoard(fromSlot, targetSlot))
            {
                return false;
            }

            this.boardView.syncFromBoard(this.session.board);
            this.emitAttackReadiness();

            return true;
        }

        if (!this.session.swapCardsOnBoard(fromSlot, targetSlot))
        {
            return false;
        }

        this.boardView.syncFromBoard(this.session.board);
        this.emitAttackReadiness();

        return true;
    }
}
