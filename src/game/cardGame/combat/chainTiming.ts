import { GAME_RULES } from '../config/cardRegistry';
import type { CardGameSession } from '../domain/CardGameSession';

/** Mid-chain enemy hit timed in ticks along the card-duration clock. */
export interface MidChainEnemyAttackPlan {
    /** Ticks from chain start until the hit lands. */
    atTicks: number;
    damage: number;
    attackerInstanceId?: string;
}

/**
 * Loop Road: enemy attack lands during your chain after `attackDuration` ticks
 * on the shared card-duration clock. Place defend so armor is up; later cards
 * decay shield. Wall-clock pacing is `ticks × gameRules.tickMs` (faster modes
 * only change tickMs).
 *
 * If the chain ends before that beat, playback still lands the hit at the end.
 */
export const getMidChainEnemyAttackPlan = (
    session: CardGameSession,
): MidChainEnemyAttackPlan | null =>
{
    if (!session.shouldPersistBoardLayout() || session.isPrepDummyPractice())
    {
        return null;
    }

    if (session.didResolveEnemyAttackMidChain())
    {
        return null;
    }

    const living = session.getLivingCombatants();

    if (living.length === 0)
    {
        return null;
    }

    const targetId = session.getAttackTargetId() ?? living[0]!.instanceId;
    const combatant = living.find((entry) => entry.instanceId === targetId) ?? living[0]!;

    const readQueuedAttack = (): MidChainEnemyAttackPlan | null =>
    {
        const queued = session.getQueuedEnemyTurn(combatant.instanceId)
            ?? session.getTelegraphedEnemyTurn(combatant.instanceId);

        if (!queued)
        {
            return null;
        }

        const attackStep = queued.steps.find((step) => step.kind === 'attack');

        if (!attackStep || (attackStep.amount ?? 0) <= 0)
        {
            return null;
        }

        const atTicks = Math.max(
            1,
            Math.round(
                combatant.definition.attackDuration
                    ?? GAME_RULES.defaultEnemyAttackDuration
                    ?? 30,
            ),
        );

        return {
            atTicks,
            damage: attackStep.amount ?? 0,
            attackerInstanceId: combatant.instanceId,
        };
    };

    const planned = readQueuedAttack();

    if (planned)
    {
        return planned;
    }

    // Engage / auto-loop can leave a stale non-attack queue — re-roll attack-only.
    session.queueNextEnemyTurn();

    return readQueuedAttack();
};
