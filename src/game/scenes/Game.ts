import { getViewportPixelSize } from '../config/gridConfig';
import { computeBoardLayout } from '../board/boardLayout';
import { ArmorView } from '../board/ArmorView';
import { CardBoardView } from '../board/CardBoardView';
import { CardHandView } from '../board/CardHandView';
import { EnemyTargetView } from '../board/EnemyTargetView';
import { CardGameSession } from '../cardGame/domain/CardGameSession';
import { CardGamePresenter } from '../cardGame/presentation/CardGamePresenter';
import { EventBus } from '../EventBus';
import { GAME_EVENTS } from '../events/gameEvents';
import { Scene } from 'phaser';

export class Game extends Scene
{
    private session?: CardGameSession;
    private presenter?: CardGamePresenter;
    private boardView?: CardBoardView;
    private handView?: CardHandView;
    private enemyView?: EnemyTargetView;
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

        this.boardView = new CardBoardView(this, layout, this.session.board);
        this.handView = new CardHandView(this, layout, [ ...this.session.getHand() ], {
            onDragMove: (worldX, worldY) =>
            {
                this.boardView?.highlightDropSlot(worldX, worldY);
            },
            onDragEnd: (handIndex, worldX, worldY) =>
            {
                return this.onCardDropped(handIndex, worldX, worldY);
            },
        });
        this.enemyView = new EnemyTargetView(this, layout, this.session.getEnemy());
        this.armorView = new ArmorView(this, layout, 0);

        this.presenter = new CardGamePresenter(
            this,
            this.session,
            this.boardView,
            this.handView,
            this.enemyView,
            this.armorView,
        );
        this.presenter.bind();

        EventBus.on(GAME_EVENTS.ATTACK, this.onAttack, this);
    }

    shutdown (): void
    {
        EventBus.off(GAME_EVENTS.ATTACK, this.onAttack, this);
        this.presenter?.unbind();
        this.boardView?.destroy();
        this.handView?.destroy();
        this.enemyView?.destroy();
        this.armorView?.destroy();
        this.presenter = undefined;
        this.boardView = undefined;
        this.handView = undefined;
        this.enemyView = undefined;
        this.armorView = undefined;
        this.session = undefined;
    }

    private onAttack = (): void =>
    {
        if (!this.session || !this.presenter)
        {
            return;
        }

        const sequence = this.session.beginAttack();

        if (!sequence)
        {
            return;
        }

        this.presenter.playAttack(sequence, () =>
        {
            this.session?.completeAttack(sequence);

            if (this.session && this.enemyView)
            {
                this.enemyView.setHealth(this.session.getEnemy());
            }
        });
    };

    private onCardDropped (handIndex: number, worldX: number, worldY: number): boolean
    {
        if (!this.session || !this.boardView || this.session.isAttackInProgress())
        {
            this.boardView?.clearHighlight();
            return false;
        }

        this.boardView.clearHighlight();

        const slot = this.boardView.findDropSlot(worldX, worldY);

        if (!slot)
        {
            return false;
        }

        if (!this.session.placeCardFromHand(handIndex, slot))
        {
            return false;
        }

        const placed = this.session.board.getCardAt(slot);

        if (placed)
        {
            this.boardView.placeCard(slot, placed);
            this.handView?.syncHand(this.session.getHand());
        }

        return placed !== null;
    }
}
