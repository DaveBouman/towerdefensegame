import { GAME_RULES } from '../config/cardRegistry';
import type { CardGameSession } from '../domain/CardGameSession';

/** Mid-chain enemy hit planned from telegraphed intent + attackDuration. */
export interface MidChainEnemyAttackPlan {
    beat: number;
    damage: number;
    attackerInstanceId?: string;
}

/**
 * Loop Road: enemy attack lands during your chain at `attackDuration` beats.
 * Place defend so its armor is up when the hit lands; later cards decay shield.
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

    const beat = Math.max(
        1,
        combatant.definition.attackDuration
            ?? GAME_RULES.defaultEnemyAttackDuration
            ?? 3,
    );

    return {
        beat,
        damage: attackStep.amount ?? 0,
        attackerInstanceId: combatant.instanceId,
    };
};
