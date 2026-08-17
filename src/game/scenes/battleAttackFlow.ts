import type { ArmorView } from '../board/ArmorView';
import type { CardBoardView } from '../board/CardBoardView';
import type { CardHandView } from '../board/CardHandView';
import type { CardPileView } from '../board/CardPileView';
import type { EnemySquadView } from '../board/EnemySquadView';
import type { PlayerHealthView } from '../board/PlayerHealthView';
import type { CardGameSession } from '../cardGame/domain/CardGameSession';
import type { AttackSequence } from '../cardGame/domain/types';
import type { CardGamePresenter } from '../cardGame/presentation/CardGamePresenter';
import { resolveEnemyPhasePlayback } from '../cardGame/presentation/playback/enemyPhasePlayback';
import { EventBus } from '../EventBus';
import { GAME_EVENTS } from '../events/gameEvents';

/** Deps bag for player attack → resolve → enemy response wiring. */
export interface BattleAttackFlowDeps
{
    session?: CardGameSession;
    presenter?: CardGamePresenter;
    boardView?: CardBoardView;
    handView?: CardHandView;
    enemySquad?: EnemySquadView;
    playerView?: PlayerHealthView;
    armorView?: ArmorView;
    graveyardView?: CardPileView;
    getRerollModeActive: () => boolean;
    cancelReroll: () => void;
    emitAttackReadiness: () => void;
    syncPileViews: () => void;
    syncBoardFromSession: () => void;
    syncLowHpVignette: () => void;
    getActivePuzzleId: () => string | null;
    delayCall: (ms: number, callback: () => void) => void;
    endBattle: () => void;
    winBattle: () => void;
    loseBattle: () => void;
}

/** Releases attack lock and re-enables player input. */
export const unlockPlayerInput = (deps: BattleAttackFlowDeps): void =>
{
    deps.presenter?.dropTransientVisualRefs();
    deps.session?.releaseAttackLock();
    deps.emitAttackReadiness();
};

export const handleAttack = (deps: BattleAttackFlowDeps): void =>
{
    if (!deps.session || !deps.presenter || deps.session.isBusy())
    {
        return;
    }

    if (deps.getRerollModeActive())
    {
        deps.cancelReroll();
    }

    const readiness = deps.session.getAttackReadiness();

    if (!readiness.canAttack)
    {
        if (readiness.reason === 'no-target')
        {
            deps.enemySquad?.flashTargetPrompt();
        }

        EventBus.emit(GAME_EVENTS.ATTACK_REJECTED, { reason: readiness.reason });
        return;
    }

    const selectedTarget = deps.enemySquad?.getSelectedId();

    if (selectedTarget)
    {
        deps.session.setAttackTarget(selectedTarget);
    }

    const chainStart = deps.session.beginAttack();

    if (!chainStart)
    {
        EventBus.emit(GAME_EVENTS.ATTACK_REJECTED, {
            reason: deps.session.getAttackReadiness().reason ?? 'no-cards-on-board',
        });
        deps.emitAttackReadiness();
        return;
    }

    // Disable Attack immediately — lock is held through chain + enemy response.
    deps.emitAttackReadiness();

    if (!deps.session.isPuzzleMode())
    {
        EventBus.emit(GAME_EVENTS.RUN_ATTACK_COUNT, {
            runAttackCount: deps.session.getRunAttackCount(),
        });
    }

    try
    {
        deps.presenter.playAttack(chainStart, (sequence) =>
        {
            handleAttackResolved(deps, sequence);
        });
    }
    catch
    {
        // Visual cleanup must never leave the attack lock stuck (blocks Attack + Reroll).
        unlockPlayerInput(deps);
    }
};

/**
 * After a chain resolves: spend energy, then the enemy responds. The board
 * persists until all energy for the round is spent.
 * Attack lock stays held through the enemy response so a second Attack cannot start.
 */
export const handleAttackResolved = (
    deps: BattleAttackFlowDeps,
    sequence: AttackSequence,
): void =>
{
    if (!deps.session)
    {
        return;
    }

    deps.session.completeAttack(sequence);

    if (!deps.boardView || !deps.enemySquad)
    {
        unlockPlayerInput(deps);
        return;
    }

    deps.playerView?.setHealth(deps.session.getPlayer());
    deps.syncLowHpVignette();

    if (deps.session.isPuzzleMode())
    {
        deps.session.spendEnergy();
        deps.session.finishPuzzle();

        deps.boardView.syncFromBoard(deps.session.board);
        deps.handView?.syncHand(deps.session.getHand());
        deps.enemySquad.syncFromSession(deps.session);
        deps.armorView?.setArmor(deps.session.getPlayer().shield);
        deps.syncPileViews();

        const evaluation = deps.session.evaluatePuzzleAttack(sequence);
        const puzzleId = deps.getActivePuzzleId() ?? 'unknown';
        const damageTarget = deps.session.getPuzzleDamageTarget() ?? 0;

        unlockPlayerInput(deps);

        deps.delayCall(900, () =>
        {
            deps.endBattle();
            EventBus.emit(GAME_EVENTS.PUZZLE_RESOLVED, {
                puzzleId,
                success: evaluation.success,
                damageDealt: evaluation.damageDealt,
                damageTarget,
            });
        });

        return;
    }

    deps.session.spendEnergy();

    deps.syncBoardFromSession();
    deps.enemySquad.syncFromSession(deps.session);
    deps.armorView?.setArmor(deps.session.getPlayer().shield);
    deps.syncPileViews();

    if (deps.session.isEnemyDefeated())
    {
        deps.enemySquad.clearIntent();
        unlockPlayerInput(deps);
        deps.winBattle();
        return;
    }

    beginPostAttackPhase(deps);
};

/** Enemy response after each attack; board clear only when energy is depleted. */
export const beginPostAttackPhase = (deps: BattleAttackFlowDeps): void =>
{
    if (!deps.session || !deps.boardView)
    {
        unlockPlayerInput(deps);
        return;
    }

    // Recover from a stuck enemy-turn flag so Attack/Reroll cannot soft-lock.
    if (deps.session.isEnemyTurnInProgress())
    {
        deps.session.cancelEnemyTurn();
    }

    if (deps.session.isEnemyDefeated() || deps.session.isPlayerDefeated())
    {
        unlockPlayerInput(deps);
        return;
    }

    if (deps.getRerollModeActive())
    {
        deps.cancelReroll();
    }

    deps.emitAttackReadiness();
    resolveEnemyPhase(deps);
};

export const endPlayerRound = (deps: BattleAttackFlowDeps): void =>
{
    if (deps.session?.isBusy())
    {
        return;
    }

    beginPostAttackPhase(deps);
};

export const handleEndTurn = (deps: BattleAttackFlowDeps): void =>
{
    endPlayerRound(deps);
};

export const resolveEnemyPhase = (deps: BattleAttackFlowDeps): void =>
{
    if (!deps.session || !deps.boardView || !deps.enemySquad)
    {
        unlockPlayerInput(deps);
        return;
    }

    resolveEnemyPhasePlayback({
        session: deps.session,
        boardView: deps.boardView,
        handView: deps.handView,
        enemySquad: deps.enemySquad,
        playerView: deps.playerView,
        armorView: deps.armorView,
        graveyardView: deps.graveyardView,
        presenter: deps.presenter,
        syncBoardFromSession: deps.syncBoardFromSession,
        syncPileViews: deps.syncPileViews,
        onPhaseSettled: (result) =>
        {
            deps.playerView?.setHealth(deps.session!.getPlayer());
            deps.syncLowHpVignette();
            unlockPlayerInput(deps);

            if (result.kind === 'player-defeated')
            {
                deps.loseBattle();
                return;
            }

            if (result.kind === 'enemy-defeated')
            {
                deps.winBattle();
                return;
            }

            if (result.kind === 'continue' && deps.session)
            {
                EventBus.emit(GAME_EVENTS.COMBAT_RECAP, deps.session.getCombatRecap());
            }
        },
    });
};
