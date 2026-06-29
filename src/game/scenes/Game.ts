import { getViewportPixelSize } from '../config/gridConfig';
import { computeBoardLayout } from '../board/boardLayout';
import { ArmorView } from '../board/ArmorView';
import { CardBoardView } from '../board/CardBoardView';
import { CardHandView } from '../board/CardHandView';
import { EnemyTargetView } from '../board/EnemyTargetView';
import { PlayerHealthView } from '../board/PlayerHealthView';
import { CardGameSession } from '../cardGame/domain/CardGameSession';
import type { SlotPosition } from '../cardGame/domain/types';
import { CardGamePresenter } from '../cardGame/presentation/CardGamePresenter';
import { EventBus } from '../EventBus';
import { GAME_EVENTS } from '../events/gameEvents';
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

    constructor ()
    {
        super('Game');
    }

    create (): void
    {
        const { width, height } = getViewportPixelSize();
        const layout = computeBoardLayout(width, height);
        this.session = new CardGameSession();

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
        }, () => !(this.boardView?.isDragging() ?? false));

        this.boardView = new CardBoardView(this, layout, this.session.board, {
            canDrag: () => !(this.handView?.isDragging() ?? false),
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
        this.armorView = new ArmorView(this, layout, 0);

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

        EventBus.on(GAME_EVENTS.ATTACK, this.onAttack, this);
        EventBus.emit(GAME_EVENTS.SCENE_READY, this);
        this.emitAttackReadiness();
    }

    shutdown (): void
    {
        EventBus.off(GAME_EVENTS.ATTACK, this.onAttack, this);
        this.session?.cancelAttack();
        this.session?.cancelEnemyTurn();
        this.presenter?.unbind();
        this.boardView?.destroy();
        this.handView?.destroy();
        this.enemyView?.destroy();
        this.playerView?.destroy();
        this.armorView?.destroy();
        this.presenter = undefined;
        this.boardView = undefined;
        this.handView = undefined;
        this.enemyView = undefined;
        this.playerView = undefined;
        this.armorView = undefined;
        this.session = undefined;
    }

    private onAttack = (): void =>
    {
        if (!this.session || !this.presenter)
        {
            return;
        }

        const readiness = this.session.getAttackReadiness();

        if (!readiness.canAttack)
        {
            EventBus.emit(GAME_EVENTS.ATTACK_REJECTED, { reason: readiness.reason });
            return;
        }

        const sequence = this.session.beginAttack();

        if (!sequence)
        {
            EventBus.emit(GAME_EVENTS.ATTACK_REJECTED, { reason: 'no-cards-on-board' });
            return;
        }

        this.presenter.playAttack(sequence, () =>
        {
            this.finishPlayerRound(sequence);
        });
    };

    private finishPlayerRound (sequence: import('../cardGame/domain/types').AttackSequence): void
    {
        if (!this.session || !this.presenter || !this.boardView || !this.enemyView)
        {
            return;
        }

        this.session.completeAttack(sequence);
        this.session.clearBoard();
        this.boardView.clearBoard();
        this.enemyView.setHealth(this.session.getEnemy());
        this.armorView?.setArmor(this.session.getPlayer().shield);

        if (this.session.isEnemyDefeated())
        {
            this.enemyView.clearIntent();
            this.emitAttackReadiness();
            return;
        }

        const enemyTurn = this.session.beginEnemyTurn();

        if (!enemyTurn)
        {
            this.emitAttackReadiness();
            return;
        }

        this.enemyView.showIntent(enemyTurn, 'executing');

        this.presenter.playEnemyTurn(enemyTurn, () =>
        {
            this.playerView?.setHealth(this.session!.getPlayer());
            this.enemyView?.setHealth(this.session!.getEnemy());

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
            this.emitAttackReadiness();
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
