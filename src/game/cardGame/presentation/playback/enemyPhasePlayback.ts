import type { CardGameSession } from '../../domain/CardGameSession';
import type { CardBoardView } from '../../../board/CardBoardView';
import type { CardHandView } from '../../../board/CardHandView';
import type { CardPileView } from '../../../board/CardPileView';
import type { EnemySquadView } from '../../../board/EnemySquadView';
import type { ArmorView } from '../../../board/ArmorView';
import type { PlayerHealthView } from '../../../board/PlayerHealthView';
import type { CardGamePresenter } from '../CardGamePresenter';

export interface EnemyPhaseResolveDeps
{
    session: CardGameSession;
    boardView: CardBoardView;
    handView?: CardHandView;
    enemySquad: EnemySquadView;
    playerView?: PlayerHealthView;
    armorView?: ArmorView;
    graveyardView?: CardPileView;
    presenter?: CardGamePresenter;
    syncBoardFromSession: () => void;
    syncPileViews: () => void;
    /** Called when the player may act again (or battle ended). */
    onPhaseSettled: (result: EnemyPhaseSettleResult) => void;
}

export type EnemyPhaseSettleResult =
    | { kind: 'continue' }
    | { kind: 'player-defeated' }
    | { kind: 'enemy-defeated' };

/**
 * Runs hand-end penalties, plays each queued enemy turn, then either refreshes
 * for another attack (energy left) or clears the board for a new energy round.
 */
export function resolveEnemyPhasePlayback (deps: EnemyPhaseResolveDeps): void
{
    const { session, boardView, enemySquad, playerView, armorView, handView } = deps;

    if (!session.isEnemyDefeated())
    {
        session.resolveHandEndPenalties();
        playerView?.setHealth(session.getPlayer());
        armorView?.setArmor(session.getPlayer().shield);
        handView?.syncHand(session.getHand());

        if (session.isPlayerDefeated())
        {
            deps.onPhaseSettled({ kind: 'player-defeated' });
            return;
        }
    }

    const finishEnemyPhase = (): void =>
    {
        playerView?.setHealth(session.getPlayer());
        enemySquad.syncFromSession(session);

        if (session.isPlayerDefeated())
        {
            deps.onPhaseSettled({ kind: 'player-defeated' });
            return;
        }

        if (session.isEnemyDefeated())
        {
            enemySquad.clearIntent();
            deps.onPhaseSettled({ kind: 'enemy-defeated' });
            return;
        }

        if (session.getEnergy() > 0)
        {
            syncBoardAfterEnemyResponse(deps);
            deps.onPhaseSettled({ kind: 'continue' });
            return;
        }

        const graveyardTarget = deps.graveyardView?.getReceivePosition() ?? { x: 0, y: 0 };

        boardView.animateCardsToGraveyard(graveyardTarget.x, graveyardTarget.y, () =>
        {
            session.clearBoard();
            session.tickDampenField();
            deps.syncBoardFromSession();
            deps.graveyardView?.pulse();
            deps.syncPileViews();
            session.finishPlayerRound();
            syncBoardAfterEnemyResponse(deps);
            deps.onPhaseSettled({ kind: 'continue' });
        });
    };

    const playEnemyResponse = (): void =>
    {
        const enemyTurn = session.beginEnemyTurn();

        if (!enemyTurn)
        {
            finishEnemyPhase();
            return;
        }

        const instanceId = enemyTurn.instanceId ?? session.getLivingCombatants()[0]?.instanceId;

        if (instanceId)
        {
            enemySquad.showIntent(instanceId, enemyTurn, 'executing');
        }

        const afterTurn = (): void =>
        {
            enemySquad.syncFromSession(session);

            if (session.isPlayerDefeated() || session.isEnemyDefeated())
            {
                finishEnemyPhase();
                return;
            }

            if (session.hasMoreEnemyTurnsInPhase())
            {
                playEnemyResponse();
                return;
            }

            finishEnemyPhase();
        };

        if (!deps.presenter)
        {
            session.completeEnemyTurn(enemyTurn);
            afterTurn();
            return;
        }

        deps.presenter.playEnemyTurn(enemyTurn, afterTurn);
    };

    session.prepareEnemyPhase();
    playEnemyResponse();
}

/** Sync board/hand/intents after an enemy response when the fight continues. */
function syncBoardAfterEnemyResponse (deps: EnemyPhaseResolveDeps): void
{
    const { session, enemySquad, handView, armorView } = deps;

    enemySquad.showAllIntents(session);
    handView?.syncHand(session.getHand());
    armorView?.setArmor(session.getPlayer().shield);
    session.placeFieldBoost();
    deps.syncBoardFromSession();
    deps.syncPileViews();
}
