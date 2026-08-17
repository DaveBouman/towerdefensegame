import type { CardGameSession } from '../cardGame/domain/CardGameSession';
import type { CardGamePresenter } from '../cardGame/presentation/CardGamePresenter';
import type { CardBoardView } from '../board/CardBoardView';
import type { CardHandView } from '../board/CardHandView';
import type { EnemySquadView } from '../board/EnemySquadView';
import type { PlayerHealthView } from '../board/PlayerHealthView';
import type { BattleModifierStatusView } from '../board/BattleModifierStatusView';
import type { ArmorView } from '../board/ArmorView';
import type { CardPileView } from '../board/CardPileView';
import type { BattlefieldBackgroundView } from '../board/BattlefieldBackgroundView';
import { destroyGameTooltipController } from '../cardGame/presentation/tooltips/GameTooltipController';
import { CARD_GAME_EVENTS } from '../cardGame/events/cardGameEvents';
import { CardGameEventBus } from '../cardGame/events/CardGameEventBus';

/** Mutable battle view/session handles owned by the Phaser Game scene. */
export interface GameBattleViewBundle {
    session?: CardGameSession;
    presenter?: CardGamePresenter;
    boardView?: CardBoardView;
    handView?: CardHandView;
    enemySquad?: EnemySquadView;
    playerView?: PlayerHealthView;
    battleModifierView?: BattleModifierStatusView;
    armorView?: ArmorView;
    deckView?: CardPileView;
    graveyardView?: CardPileView;
    battlefieldBackground?: BattlefieldBackgroundView;
    lowHpVignette?: Phaser.GameObjects.Rectangle;
    phaseShiftHandler?: (payload: { label: string; message: string }) => void;
}

/** Tears down an in-flight battle and clears view references on `host`. */
export const destroyBattleViews = (host: GameBattleViewBundle): void =>
{
    if (host.phaseShiftHandler)
    {
        CardGameEventBus.off(CARD_GAME_EVENTS.PHASE_SHIFT, host.phaseShiftHandler);
        host.phaseShiftHandler = undefined;
    }

    host.session?.cancelAttack();
    host.session?.cancelEnemyTurn();
    host.presenter?.unbind();
    host.boardView?.destroy();
    host.handView?.destroy();
    host.enemySquad?.destroy();
    host.playerView?.destroy();
    host.battleModifierView?.destroy();
    host.armorView?.destroy();
    host.deckView?.destroy();
    host.graveyardView?.destroy();
    destroyGameTooltipController();
    host.presenter = undefined;
    host.boardView = undefined;
    host.handView = undefined;
    host.enemySquad = undefined;
    host.playerView = undefined;
    host.battleModifierView = undefined;
    host.armorView = undefined;
    host.deckView = undefined;
    host.graveyardView = undefined;
    host.session = undefined;
    host.battlefieldBackground?.destroy();
    host.battlefieldBackground = undefined;
    host.lowHpVignette?.destroy();
    host.lowHpVignette = undefined;
};
