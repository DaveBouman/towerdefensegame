import { GAME_RULES } from '../config/cardRegistry';
import type { AttackSequence } from '../domain/types';
import { collectComboTrails } from './comboTrailRegistry';
import { typeStackMultiplier } from './typeStack';

/** True when this Attack sequence landed at least one combo payoff. */
export const loopLandedComboEvent = (sequence: AttackSequence): boolean =>
{
    for (const effect of sequence.chainAbilityEffects)
    {
        if (
            effect.enemyDamage > 0
            || effect.armorGain > 0
            || effect.poisonStacks > 0
            || effect.playerDamage > 0
        )
        {
            return true;
        }
    }

    for (const multiplier of Object.values(sequence.stackMultipliers))
    {
        if (typeof multiplier === 'number' && multiplier >= typeStackMultiplier(3))
        {
            return true;
        }
    }

    if (sequence.chain.some((step) => step.behaviorId === 'echo'))
    {
        return true;
    }

    const trailSteps = sequence.chain.map((step) => ({
        slot: step.slot,
        behaviorId: step.behaviorId,
        definitionId: step.definitionId,
    }));
    const { hits } = collectComboTrails(trailSteps, sequence.chain, 2);

    return hits.length > 0;
};

export const getComboMomentumMultiplier = (momentum: number): number =>
{
    const bonus = GAME_RULES.comboMomentumBonus ?? 0.15;

    return 1 + Math.max(0, momentum) * bonus;
};

export const getLoopEnemyHitMultiplier = (loopsCompleted: number): number =>
{
    const step = GAME_RULES.loopEnemyHitEscalation ?? 0.2;

    return 1 + Math.max(0, loopsCompleted) * step;
};

/** Scale enemy attack step amounts for Loop Road hit escalation. */
export const scaleEnemyTurnAttackDamage = <T extends { steps: readonly { kind: string; amount?: number }[] }>(
    action: T,
    multiplier: number,
): T =>
{
    if (multiplier <= 1.0001)
    {
        return action;
    }

    return {
        ...action,
        steps: action.steps.map((step) =>
        {
            if (step.kind !== 'attack' || (step.amount ?? 0) <= 0)
            {
                return step;
            }

            return {
                ...step,
                amount: Math.max(1, Math.round((step.amount ?? 0) * multiplier)),
            };
        }),
    };
};
