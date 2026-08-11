import { applyBoardLayout, computeBoardLayout, type BoardLayout } from '../board/boardLayout';
import { BattlefieldBackgroundView } from '../board/BattlefieldBackgroundView';
import { MapBackgroundView } from '../board/MapBackgroundView';
import { ArmorView } from '../board/ArmorView';
import { CardBoardView } from '../board/CardBoardView';
import { CardHandView } from '../board/CardHandView';
import { CardPileView } from '../board/CardPileView';
import { EnemySquadView } from '../board/EnemySquadView';
import { BattleModifierStatusView } from '../board/BattleModifierStatusView';
import { PlayerHealthView } from '../board/PlayerHealthView';
import { CardGameSession } from '../cardGame/domain/CardGameSession';
import { GAME_RULES, getCardDefinitionOrThrow } from '../cardGame/config/cardRegistry';
import type { SlotPosition } from '../cardGame/domain/types';
import { destroyGameTooltipController } from '../cardGame/presentation/tooltips/GameTooltipController';
import { preloadEnemyPassiveIcons } from '../cardGame/presentation/icons/preloadEnemyPassiveIcons';
import { preloadEnemyPortraits } from '../cardGame/presentation/icons/preloadEnemyPortraits';
import { CardGamePresenter } from '../cardGame/presentation/CardGamePresenter';
import { resolveEnemyPhasePlayback } from '../cardGame/presentation/playback/enemyPhasePlayback';
import { playFloatingText } from '../cardGame/presentation/visualEffects/visualEffectTweens';
import { CardGameEventBus } from '../cardGame/events/CardGameEventBus';
import { CARD_GAME_EVENTS } from '../cardGame/events/cardGameEvents';
import { EventBus } from '../EventBus';
import { GAME_EVENTS } from '../events/gameEvents';
import { reseed } from '../random/rng';
import { getRunPuzzle } from '../run/runPuzzles';
import type { PuzzleModeConfig } from '../cardGame/domain/CardGameSession';
import { unlockEnemies } from '../run/enemyBestiary';
import {
    bindGameAudioListeners,
    resetBattleAudioState,
} from '../audio/bindGameAudio';
import { bindGameBgmListeners } from '../audio/bindGameBgm';
import {
    bindGameAudioScene,
    markSfxLoaded,
    preloadSfx,
    unbindGameAudioScene,
} from '../audio/gameAudio';
import {
    bindGameBgmScene,
    markBgmLoaded,
    preloadBgm,
    unbindGameBgmScene,
} from '../audio/gameBgm';
import { BlendModes, Scene } from 'phaser';

const sameSlot = (a: SlotPosition, b: SlotPosition): boolean =>
    a.row === b.row && a.col === b.col;

export class Game extends Scene
{
    private session?: CardGameSession;
    private presenter?: CardGamePresenter;
    private boardView?: CardBoardView;
    private handView?: CardHandView;
    private enemySquad?: EnemySquadView;
    private playerView?: PlayerHealthView;
    private battleModifierView?: BattleModifierStatusView;
    private armorView?: ArmorView;
    private deckView?: CardPileView;
    private graveyardView?: CardPileView;
    private rerollModeActive = false;
    private layout?: BoardLayout;
    private battleActive = false;
    private battleResolved = false;
    private activePuzzleId: string | null = null;
    private lowHpVignette?: Phaser.GameObjects.Rectangle;
    private battlefieldBackground?: BattlefieldBackgroundView;
    private mapBackground?: MapBackgroundView;
    private runPhase = 'map';
    private unbindAudio?: () => void;
    private unbindBgm?: () => void;
    private pileInspectionBlocked = false;

    constructor ()
    {
        super('Game');
    }

    preload (): void
    {
        preloadSfx(this);
        preloadBgm(this);
    }

    create (): void
    {
        bindGameAudioScene(this);
        bindGameBgmScene(this);
        markSfxLoaded();
        markBgmLoaded();
        this.unbindAudio = bindGameAudioListeners();
        this.unbindBgm = bindGameBgmListeners();

        void Promise.all([
            preloadEnemyPassiveIcons(this),
            preloadEnemyPortraits(this),
        ]).then(() =>
        {
            this.registerListeners();
            EventBus.emit(GAME_EVENTS.SCENE_READY, this);
        });
    }

    private registerListeners (): void
    {
        EventBus.on(GAME_EVENTS.START_BATTLE, this.onStartBattle, this);
        EventBus.on(GAME_EVENTS.START_PUZZLE, this.onStartPuzzle, this);
        EventBus.on(GAME_EVENTS.ATTACK, this.onAttack, this);
        EventBus.on(GAME_EVENTS.END_TURN, this.onEndTurn, this);
        EventBus.on(GAME_EVENTS.REROLL_BEGIN, this.onRerollBegin, this);
        EventBus.on(GAME_EVENTS.REROLL_CONFIRM, this.onRerollConfirm, this);
        EventBus.on(GAME_EVENTS.REROLL_CANCEL, this.onRerollCancel, this);
        EventBus.on(GAME_EVENTS.UI_OVERLAY_ACTIVE, this.onUiOverlayActive, this);
        EventBus.on(GAME_EVENTS.RUN_PHASE, this.onRunPhase, this);
        CardGameEventBus.on(CARD_GAME_EVENTS.PILES_CHANGED, this.onPilesChanged, this);
        CardGameEventBus.on(CARD_GAME_EVENTS.REROLLS_CHANGED, this.onRerollsChanged, this);
        CardGameEventBus.on(CARD_GAME_EVENTS.COMBATANTS_CHANGED, this.onCombatantsChanged, this);
        this.scale.on('resize', this.onResize, this);
    }

    private onRunPhase = ({ phase }: { phase: string }): void =>
    {
        this.runPhase = phase;
        this.syncRunBackdrop();
    };

    private syncRunBackdrop (): void
    {
        if (this.runPhase === 'map' || this.runPhase === 'menu')
        {
            this.battlefieldBackground?.destroy();
            this.battlefieldBackground = undefined;

            if (!this.mapBackground)
            {
                this.mapBackground = new MapBackgroundView(this);
            }

            const { width, height } = this.scale;

            this.mapBackground.resize(width, height);
            this.mapBackground.container.setVisible(true);

            return;
        }

        this.mapBackground?.container.setVisible(false);
    };

    private onUiOverlayActive = (
        { blockPileInspection }: { blockPileInspection?: boolean },
    ): void =>
    {
        this.pileInspectionBlocked = blockPileInspection ?? false;
        this.syncPileClickHandlers();
    };

    private syncPileClickHandlers (): void
    {
        if (this.pileInspectionBlocked)
        {
            this.deckView?.setClickHandler(null);
            this.graveyardView?.setClickHandler(null);

            return;
        }

        this.deckView?.setClickHandler(() => this.openPileView('deck'));
        this.graveyardView?.setClickHandler(() => this.openPileView('graveyard'));
    };

    private syncBattleModifierLayout (): void
    {
        if (!this.battleModifierView || !this.layout || !this.playerView || !this.enemySquad)
        {
            return;
        }

        this.battleModifierView.setAnchors({
            getPlayerBottomY: () => this.playerView!.getStatusChromeBottomWorldY(),
            getEnemyBottomY: () => this.enemySquad!.getMaxStatusChromeBottomWorldY(),
        });
    };

    private onStartBattle = (
        { enemyId, enemyIds, startHealth, deck, seed, bodyMods, runAttackCount, rerollsRemaining, runModifiers, runGold }:
        {
            enemyId?: string;
            enemyIds?: readonly string[];
            startHealth: number;
            deck: string[];
            seed: number;
            bodyMods: string[];
            runAttackCount: number;
            rerollsRemaining: number;
            runModifiers?: readonly string[];
            runGold?: number;
        },
    ): void =>
    {
        if (this.battleActive)
        {
            this.endBattle();
        }

        const battleEnemyIds = enemyIds && enemyIds.length > 0
            ? enemyIds
            : enemyId
                ? [ enemyId ]
                : [ GAME_RULES.defaultEnemyId ];

        this.startBattle(
            battleEnemyIds,
            startHealth,
            deck,
            seed,
            bodyMods,
            null,
            runAttackCount,
            rerollsRemaining,
            runModifiers ?? [],
            runGold ?? 0,
        );
    };

    private onStartPuzzle = (
        { puzzleId, startHealth, seed, bodyMods, runAttackCount }:
        { puzzleId: string; startHealth: number; seed: number; bodyMods: string[]; runAttackCount: number },
    ): void =>
    {
        if (this.battleActive)
        {
            this.endBattle();
        }

        this.startPuzzle(puzzleId, startHealth, seed, bodyMods, runAttackCount);
    };

    private startPuzzle (
        puzzleId: string,
        startHealth: number,
        seed: number,
        bodyMods: string[],
        runAttackCount: number,
    ): void
    {
        const puzzle = getRunPuzzle(puzzleId);
        const puzzleMode: PuzzleModeConfig = {
            handCards: puzzle.cards,
            damageTarget: puzzle.damageTarget,
        };

        this.activePuzzleId = puzzleId;
        this.startBattle('training-dummy', startHealth, [], seed, bodyMods, puzzleMode, runAttackCount, 0);

        EventBus.emit(GAME_EVENTS.PUZZLE_STATE, {
            puzzleId,
            title: puzzle.title,
            hint: puzzle.hint,
            damageTarget: puzzle.damageTarget,
            cardCount: puzzle.cards.length,
            isPuzzle: true,
        });
    }

    private startBattle (
        enemyIds: string | readonly string[],
        startHealth: number,
        deck: string[],
        seed: number,
        bodyMods: string[],
        puzzleMode: PuzzleModeConfig | null = null,
        runAttackCount = 0,
        rerollsRemaining = GAME_RULES.rerollsPerFloor,
        runModifiers: readonly string[] = [],
        runGold = 0,
    ): void
    {
        resetBattleAudioState();

        // Install this battle's deterministic RNG stream before any card is dealt.
        reseed(seed);

        if (!puzzleMode)
        {
            this.activePuzzleId = null;
        }

        const { width, height } = this.scale;
        this.layout = computeBoardLayout(width, height);
        const layout = this.layout;

        this.battlefieldBackground?.destroy();
        this.battlefieldBackground = new BattlefieldBackgroundView(this);
        this.battlefieldBackground.resize(width, height, layout);

        this.rerollModeActive = false;
        this.battleResolved = false;
        this.session = new CardGameSession(
            enemyIds,
            startHealth,
            deck,
            bodyMods,
            puzzleMode,
            runAttackCount,
            puzzleMode ? 0 : rerollsRemaining,
            runModifiers,
            runGold,
        );

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
        this.playerView.setCombatTraits(this.session.getPlayerCombatTraits());
        this.enemySquad = new EnemySquadView(
            this,
            layout,
            this.session.getCombatants(),
            (instanceId) =>
            {
                if (!this.session || this.session.isBusy())
                {
                    return;
                }

                this.session.setAttackTarget(instanceId);
                this.emitAttackReadiness();
            },
        );
        this.battleModifierView = new BattleModifierStatusView(
            this,
            layout,
            this.session.getCombatants().length,
        );
        this.syncBattleModifierLayout();
        this.battleModifierView.setModifiers(this.session.getBattleModifiers());
        this.armorView = new ArmorView(this, layout, 0);
        this.deckView = new CardPileView(this, layout, layout.deckX, layout.deckY, 'Deck', 'deck');
        this.graveyardView = new CardPileView(this, layout, layout.graveyardX, layout.graveyardY, 'Graveyard', 'graveyard');
        this.syncPileClickHandlers();
        this.syncPileViews();

        if (!this.session.isPuzzleMode())
        {
            this.session.placeFieldBoost();
        }
        this.syncBoardFromSession();

        this.presenter = new CardGamePresenter(
            this,
            this.session,
            this.boardView,
            this.handView,
            this.enemySquad,
            this.playerView,
            this.armorView,
            this.battleModifierView,
        );
        this.presenter.bind();

        if (!this.session.isPuzzleMode())
        {
            this.enemySquad.showAllIntents(this.session);
        }

        this.battleActive = true;
        this.syncLowHpVignette();
        this.emitAttackReadiness();
        this.emitRerollState();
    }

    private ensureLowHpVignette (): void
    {
        if (this.lowHpVignette?.active)
        {
            return;
        }

        const camera = this.cameras.main;

        this.lowHpVignette = this.add.rectangle(
            camera.centerX,
            camera.centerY,
            camera.width,
            camera.height,
            0x8b0000,
            0,
        )
            .setScrollFactor(0)
            .setDepth(9000)
            .setBlendMode(BlendModes.MULTIPLY);
    }

    private syncLowHpVignette (): void
    {
        if (!this.session || !this.battleActive || this.session.isPuzzleMode())
        {
            this.lowHpVignette?.setAlpha(0);

            return;
        }

        this.ensureLowHpVignette();

        const player = this.session.getPlayer();
        const ratio = player.maxHealth > 0 ? player.health / player.maxHealth : 1;

        if (ratio <= 0.25 && ratio > 0)
        {
            this.lowHpVignette!.setAlpha(0.1 + (0.25 - ratio) * 0.3);
        }
        else
        {
            this.lowHpVignette!.setAlpha(0);
        }
    }

    private onResize = (gameSize: Phaser.Structs.Size): void =>
    {
        if (!this.layout || !this.boardView || !this.handView || !this.enemySquad
            || !this.playerView || !this.armorView || !this.deckView || !this.graveyardView)
        {
            return;
        }

        this.layout = computeBoardLayout(gameSize.width, gameSize.height);
        this.battlefieldBackground?.resize(gameSize.width, gameSize.height, this.layout);
        applyBoardLayout(this.layout, {
            board: this.boardView,
            hand: this.handView.container,
            enemy: this.enemySquad.firstView?.container ?? this.playerView.container,
            player: this.playerView.container,
            armor: this.armorView.container,
            deck: this.deckView.container,
            graveyard: this.graveyardView.container,
        });
        this.enemySquad.applyLayout(this.layout);
        this.syncBattleModifierLayout();
        this.battleModifierView?.reposition(this.layout, this.session?.getCombatants().length ?? 1);
        this.mapBackground?.resize(gameSize.width, gameSize.height);
    };

    private endBattle (): void
    {
        this.session?.cancelAttack();
        this.session?.cancelEnemyTurn();
        this.presenter?.unbind();
        this.boardView?.destroy();
        this.handView?.destroy();
        this.enemySquad?.destroy();
        this.playerView?.destroy();
        this.battleModifierView?.destroy();
        this.armorView?.destroy();
        this.deckView?.destroy();
        this.graveyardView?.destroy();
        destroyGameTooltipController();
        this.presenter = undefined;
        this.boardView = undefined;
        this.handView = undefined;
        this.enemySquad = undefined;
        this.playerView = undefined;
        this.battleModifierView = undefined;
        this.armorView = undefined;
        this.deckView = undefined;
        this.graveyardView = undefined;
        this.session = undefined;
        this.battleActive = false;
        this.activePuzzleId = null;
        this.rerollModeActive = false;
        this.battlefieldBackground?.destroy();
        this.battlefieldBackground = undefined;
        this.lowHpVignette?.destroy();
        this.lowHpVignette = undefined;
    }

    private winBattle (): void
    {
        if (this.battleResolved || !this.session)
        {
            return;
        }

        this.battleResolved = true;
        const playerHealth = this.session.getPlayer().health;
        const runAttackCount = this.session.getRunAttackCount();
        const { goldStolen, stolenCardIds } = this.session.getRunBattleDeltas();

        this.time.delayedCall(900, () =>
        {
            this.endBattle();
            EventBus.emit(GAME_EVENTS.BATTLE_WON, {
                playerHealth,
                runAttackCount,
                goldStolen,
                stolenCardIds,
            });
        });
    }

    private loseBattle (): void
    {
        if (this.battleResolved || !this.session)
        {
            return;
        }

        this.battleResolved = true;
        const runAttackCount = this.session.getRunAttackCount();
        const { goldStolen, stolenCardIds } = this.session.getRunBattleDeltas();

        this.time.delayedCall(900, () =>
        {
            this.endBattle();
            EventBus.emit(GAME_EVENTS.BATTLE_LOST, {
                runAttackCount,
                goldStolen,
                stolenCardIds,
            });
        });
    }

    shutdown (): void
    {
        this.unbindAudio?.();
        this.unbindAudio = undefined;
        this.unbindBgm?.();
        this.unbindBgm = undefined;
        unbindGameAudioScene();
        unbindGameBgmScene();

        this.scale.off('resize', this.onResize, this);
        EventBus.off(GAME_EVENTS.START_BATTLE, this.onStartBattle, this);
        EventBus.off(GAME_EVENTS.START_PUZZLE, this.onStartPuzzle, this);
        EventBus.off(GAME_EVENTS.ATTACK, this.onAttack, this);
        EventBus.off(GAME_EVENTS.END_TURN, this.onEndTurn, this);
        EventBus.off(GAME_EVENTS.REROLL_BEGIN, this.onRerollBegin, this);
        EventBus.off(GAME_EVENTS.REROLL_CONFIRM, this.onRerollConfirm, this);
        EventBus.off(GAME_EVENTS.REROLL_CANCEL, this.onRerollCancel, this);
        EventBus.off(GAME_EVENTS.UI_OVERLAY_ACTIVE, this.onUiOverlayActive, this);
        EventBus.off(GAME_EVENTS.RUN_PHASE, this.onRunPhase, this);
        CardGameEventBus.off(CARD_GAME_EVENTS.PILES_CHANGED, this.onPilesChanged, this);
        CardGameEventBus.off(CARD_GAME_EVENTS.REROLLS_CHANGED, this.onRerollsChanged, this);
        CardGameEventBus.off(CARD_GAME_EVENTS.COMBATANTS_CHANGED, this.onCombatantsChanged, this);
        this.mapBackground?.destroy();
        this.mapBackground = undefined;
        this.endBattle();
    }

    private onPilesChanged = ({ deckSize, discardSize }: { deckSize: number; discardSize: number }): void =>
    {
        if (!this.session)
        {
            return;
        }

        this.deckView?.setStack(deckSize, this.session.getDeckTopCard() ?? null);
        this.graveyardView?.setStack(discardSize, this.session.getDiscardTopCard() ?? null);
    };

    private onCombatantsChanged = ({
        added,
        removed,
        reason,
    }: {
        added: string[];
        removed: string[];
        reason: 'spawn' | 'shatter' | 'flee';
    }): void =>
    {
        if (!this.session || !this.enemySquad)
        {
            return;
        }

        const spawned = added
            .map((instanceId) => this.session!.getCombatant(instanceId))
            .filter((combatant): combatant is NonNullable<typeof combatant> => Boolean(combatant));

        this.enemySquad.applyRosterChange(this.session, spawned, removed);
        this.syncBattleModifierLayout();
        this.emitAttackReadiness();
        unlockEnemies(spawned.map((combatant) => combatant.definitionId));

        const anchor = this.enemySquad.firstView?.container;

        if (!anchor)
        {
            return;
        }

        playFloatingText(
            this,
            anchor,
            anchor.width / 2,
            -8,
            reason === 'shatter' ? 'SHATTER' : reason === 'flee' ? 'FLED' : 'SPAWN',
            reason === 'shatter' ? '#ff9a8a' : '#7af0ff',
        );
    };

    private syncPileViews (): void
    {
        if (!this.session)
        {
            return;
        }

        const { deckSize, discardSize } = this.session.getPileCounts();

        this.deckView?.setStack(deckSize, this.session.getDeckTopCard() ?? null);
        this.graveyardView?.setStack(discardSize, this.session.getDiscardTopCard() ?? null);
    }

    private syncBoardFromSession (): void
    {
        if (!this.session || !this.boardView)
        {
            return;
        }

        // Drop cached glow targets before wrappers are destroyed/rebuilt.
        this.presenter?.dropTransientVisualRefs();
        this.boardView.syncFromBoard(this.session.board);
        this.boardView.setBlockedSlots(
            this.session.getPlacementBlockedSlots(),
            this.session.getBombDisabledSlots(),
        );
        this.boardView.setDampenedSlots(this.session.getDampenedSlots());
    }

    private openPileView (kind: 'deck' | 'graveyard'): void
    {
        if (!this.session)
        {
            return;
        }

        const source = kind === 'deck'
            ? this.session.getDeckCards()
            : this.session.getDiscardCards();

        // Graveyard: newest on top. Deck: order is scrambled in the overlay (alphabetical).
        const ordered = kind === 'graveyard' ? [ ...source ].reverse() : [ ...source ];
        const cards = ordered.map((card) =>
        {
            const definition = getCardDefinitionOrThrow(card.definitionId);

            return {
                definitionId: card.definitionId,
                label: definition.label,
                power: definition.power,
                behaviorId: definition.behaviorId,
                arrow: card.arrow,
                loopArrow: card.loopArrow,
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
        if (!this.session || !this.presenter || this.session.isBusy())
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
            if (readiness.reason === 'no-target')
            {
                this.enemySquad?.flashTargetPrompt();
            }

            EventBus.emit(GAME_EVENTS.ATTACK_REJECTED, { reason: readiness.reason });
            return;
        }

        const selectedTarget = this.enemySquad?.getSelectedId();

        if (selectedTarget)
        {
            this.session.setAttackTarget(selectedTarget);
        }

        const chainStart = this.session.beginAttack();

        if (!chainStart)
        {
            EventBus.emit(GAME_EVENTS.ATTACK_REJECTED, {
                reason: this.session.getAttackReadiness().reason ?? 'no-cards-on-board',
            });
            this.emitAttackReadiness();
            return;
        }

        // Disable Attack immediately — lock is held through chain + enemy response.
        this.emitAttackReadiness();

        if (!this.session.isPuzzleMode())
        {
            EventBus.emit(GAME_EVENTS.RUN_ATTACK_COUNT, {
                runAttackCount: this.session.getRunAttackCount(),
            });
        }

        try
        {
            this.presenter.playAttack(chainStart, (sequence) =>
            {
                this.onAttackResolved(sequence);
            });
        }
        catch
        {
            // Visual cleanup must never leave the attack lock stuck (blocks Attack + Reroll).
            this.unlockPlayerInput();
        }
    };

    /**
     * After a chain resolves: spend energy, then the enemy responds. The board
     * persists until all energy for the round is spent.
     * Attack lock stays held through the enemy response so a second Attack cannot start.
     */
    private onAttackResolved (sequence: import('../cardGame/domain/types').AttackSequence): void
    {
        if (!this.session)
        {
            return;
        }

        this.session.completeAttack(sequence);

        if (!this.boardView || !this.enemySquad)
        {
            this.unlockPlayerInput();
            return;
        }

        this.playerView?.setHealth(this.session.getPlayer());
        this.syncLowHpVignette();

        if (this.session.isPuzzleMode())
        {
            this.session.spendEnergy();
            this.session.finishPuzzle();

            this.boardView.syncFromBoard(this.session.board);
            this.handView?.syncHand(this.session.getHand());
            this.enemySquad.syncFromSession(this.session);
            this.armorView?.setArmor(this.session.getPlayer().shield);
            this.syncPileViews();

            const evaluation = this.session.evaluatePuzzleAttack(sequence);
            const puzzleId = this.activePuzzleId ?? 'unknown';
            const damageTarget = this.session.getPuzzleDamageTarget() ?? 0;

            this.unlockPlayerInput();

            this.time.delayedCall(900, () =>
            {
                this.endBattle();
                EventBus.emit(GAME_EVENTS.PUZZLE_RESOLVED, {
                    puzzleId,
                    success: evaluation.success,
                    damageDealt: evaluation.damageDealt,
                    damageTarget,
                });
            });

            return;
        }

        this.session.spendEnergy();

        this.syncBoardFromSession();
        this.enemySquad.syncFromSession(this.session);
        this.armorView?.setArmor(this.session.getPlayer().shield);
        this.syncPileViews();

        if (this.session.isEnemyDefeated())
        {
            this.enemySquad.clearIntent();
            this.unlockPlayerInput();
            this.winBattle();
            return;
        }

        this.beginPostAttackPhase();
    }

    /** Enemy response after each attack; board clear only when energy is depleted. */
    private beginPostAttackPhase (): void
    {
        if (!this.session || !this.boardView)
        {
            this.unlockPlayerInput();
            return;
        }

        // Recover from a stuck enemy-turn flag so Attack/Reroll cannot soft-lock.
        if (this.session.isEnemyTurnInProgress())
        {
            this.session.cancelEnemyTurn();
        }

        if (this.session.isEnemyDefeated() || this.session.isPlayerDefeated())
        {
            this.unlockPlayerInput();
            return;
        }

        if (this.rerollModeActive)
        {
            this.onRerollCancel();
        }

        this.emitAttackReadiness();
        this.resolveEnemyPhase();
    }

    private endPlayerRound = (): void =>
    {
        if (this.session?.isBusy())
        {
            return;
        }

        this.beginPostAttackPhase();
    };

    private onEndTurn = (): void =>
    {
        this.endPlayerRound();
    };

    /** Releases attack lock and re-enables player input. */
    private unlockPlayerInput (): void
    {
        this.presenter?.dropTransientVisualRefs();
        this.session?.releaseAttackLock();
        this.emitAttackReadiness();
    }

    private resolveEnemyPhase (): void
    {
        if (!this.session || !this.boardView || !this.enemySquad)
        {
            this.unlockPlayerInput();
            return;
        }

        resolveEnemyPhasePlayback({
            session: this.session,
            boardView: this.boardView,
            handView: this.handView,
            enemySquad: this.enemySquad,
            playerView: this.playerView,
            armorView: this.armorView,
            graveyardView: this.graveyardView,
            presenter: this.presenter,
            syncBoardFromSession: () => this.syncBoardFromSession(),
            syncPileViews: () => this.syncPileViews(),
            onPhaseSettled: (result) =>
            {
                this.playerView?.setHealth(this.session!.getPlayer());
                this.syncLowHpVignette();
                this.unlockPlayerInput();

                if (result.kind === 'player-defeated')
                {
                    this.loseBattle();
                    return;
                }

                if (result.kind === 'enemy-defeated')
                {
                    this.winBattle();
                }
            },
        });
    }

    private onRerollsChanged = (): void =>
    {
        this.emitRerollState();
    };

    private onRerollBegin = (): void =>
    {
        if (!this.session)
        {
            return;
        }

        if (!this.session.canReroll())
        {
            if (this.session.isBusy())
            {
                EventBus.emit(GAME_EVENTS.ATTACK_REJECTED, {
                    reason: this.session.isAttackInProgress() ? 'attack-in-progress' : 'enemy-turn',
                });
            }

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
            maxRerollsPerFloor: GAME_RULES.rerollsPerFloor,
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

        this.enemySquad?.syncFromSession(this.session);
        this.enemySquad?.syncTargetPrompt(this.session);
        this.syncBattleModifierLayout();
        this.battleModifierView?.setModifiers(this.session.getBattleModifiers());

        if (!this.session.isBusy()
            && !this.session.isEnemyDefeated())
        {
            this.enemySquad?.showAllIntents(this.session);
        }

        EventBus.emit(GAME_EVENTS.CARD_ATTACK_READY, this.session.getAttackReadiness());
        this.emitTurnState();
        this.emitRerollState();
    }

    private emitTurnState (): void
    {
        if (!this.session)
        {
            return;
        }

        EventBus.emit(GAME_EVENTS.TURN_STATE, {
            energy: this.session.getEnergy(),
            maxEnergy: this.session.getMaxEnergy(),
            // Energy refills automatically when a full round of attacks is spent.
            canEndTurn: false,
        });
    }

    private onCardDropped (handIndex: number, worldX: number, worldY: number): boolean
    {
        if (!this.session || !this.boardView || !this.session.canEditBoard())
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
        if (!this.session || !this.boardView || !this.handView || !this.session.canEditBoard())
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
