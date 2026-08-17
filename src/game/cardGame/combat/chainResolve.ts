import { GAME_RULES, getCardDefinitionOrThrow, type CardDefinition } from '../config/cardRegistry';
import type { ActivationStep } from '../domain/types';
import { getAllDefendIndicesReplacedByPoison } from '../abilities/poisonReplacement';
import {
    getBoostMultiplierForStep,
    hasBoostBeforeStep,
    isStreakNeutralBehavior,
    scaleBoostedValue,
} from './chainBoost';
import { applyBombConversion } from './bombConversion';

export { getBoostMultiplierForStep, isStreakNeutralBehavior } from './chainBoost';

const STACKABLE_BEHAVIORS = new Set([ 'attack', 'defend' ]);

const streakToMultiplier = (streak: number): number =>
{
    if (streak <= 1)
    {
        return 1;
    }

    return 1 + (streak - 1) * GAME_RULES.typeStackBonus.perDuplicate;
};

/** Consecutive streak length for a stackable step; skills in between do not reset it. */
export const computeStreakAtIndex = (
    chain: readonly ActivationStep[],
    index: number,
): number =>
{
    const step = chain[index];

    if (!step || isStreakNeutralBehavior(step.behaviorId))
    {
        return 0;
    }

    let streakBehavior: string | null = null;
    let streak = 0;

    for (let i = 0; i <= index; i++)
    {
        const current = chain[i]!;

        if (isStreakNeutralBehavior(current.behaviorId))
        {
            continue;
        }

        if (current.behaviorId === streakBehavior)
        {
            streak += 1;
        }
        else
        {
            streakBehavior = current.behaviorId;
            streak = 1;
        }
    }

    return streak;
};

export const isBoostDefinition = (definition: CardDefinition): boolean =>
    definition.behaviorId === 'boost';

/** Peak streak multiplier per behavior — for HUD / sequence metadata. */
export const computeChainTypeMultipliers = (
    chain: readonly ActivationStep[],
): Partial<Record<string, number>> =>
{
    const peakStreak = new Map<string, number>();

    chain.forEach((step, index) =>
    {
        if (!STACKABLE_BEHAVIORS.has(step.behaviorId))
        {
            return;
        }

        const streak = computeStreakAtIndex(chain, index);
        const currentPeak = peakStreak.get(step.behaviorId) ?? 0;

        if (streak > currentPeak)
        {
            peakStreak.set(step.behaviorId, streak);
        }
    });

    const multipliers: Partial<Record<string, number>> = {};

    for (const [ behaviorId, streak ] of peakStreak)
    {
        const multiplier = streakToMultiplier(streak);

        if (multiplier > 1)
        {
            multipliers[behaviorId] = multiplier;
        }
    }

    return multipliers;
};

const applyChainStacking = (chain: ActivationStep[]): ActivationStep[] =>
    chain.map((step, index) =>
    {
        if (!STACKABLE_BEHAVIORS.has(step.behaviorId))
        {
            return step;
        }

        const multiplier = streakToMultiplier(computeStreakAtIndex(chain, index));

        if (multiplier <= 1)
        {
            return step;
        }

        if (step.behaviorId === 'attack' && step.damage > 0)
        {
            return {
                ...step,
                damage: Math.round(step.damage * multiplier),
            };
        }

        if (step.behaviorId === 'defend' && step.armor > 0)
        {
            return {
                ...step,
                armor: Math.round(step.armor * multiplier),
            };
        }

        return step;
    });

const applyPoisonArmorReplacement = (chain: ActivationStep[]): ActivationStep[] =>
{
    const suppressed = getAllDefendIndicesReplacedByPoison(chain);

    if (suppressed.size === 0)
    {
        return chain;
    }

    return chain.map((step, index) =>
        suppressed.has(index) ? { ...step, armor: 0 } : step,
    );
};

/** Buffs the next chain step after field boosts (stacked boosts multiply). */
export const applyBoostBonuses = (chain: ActivationStep[]): ActivationStep[] =>
    chain.map((step, index) =>
    {
        const multiplier = getBoostMultiplierForStep(chain, index);

        if (multiplier <= 1)
        {
            return step;
        }

        let damage = step.damage;
        let armor = step.armor;
        let thorns = step.thorns ?? 0;

        if (damage > 0)
        {
            damage = scaleBoostedValue(damage, multiplier);
        }

        if (armor > 0)
        {
            armor = scaleBoostedValue(armor, multiplier);
        }

        if (thorns > 0)
        {
            thorns = scaleBoostedValue(thorns, multiplier);
        }

        if (damage === step.damage && armor === step.armor && thorns === (step.thorns ?? 0))
        {
            return step;
        }

        return {
            ...step,
            damage,
            armor,
            thorns,
        };
    });

export const isBoostedChainStep = (
    chain: readonly ActivationStep[],
    index: number,
): boolean =>
{
    if (!hasBoostBeforeStep(chain, index))
    {
        return false;
    }

    const step = chain[index];

    if ((step?.damage ?? 0) + (step?.armor ?? 0) + (step?.thorns ?? 0) > 0)
    {
        return true;
    }

    const definition = step ? getCardDefinitionOrThrow(step.definitionId) : undefined;

    if (definition?.behaviorId === 'battle-mod' && definition.battleModifier)
    {
        return true;
    }

    if (definition?.behaviorId === 'thorns')
    {
        return true;
    }

    return (definition?.chainAbilityIds?.length ?? 0) > 0;
};

const applyStepDamageMultipliers = (chain: ActivationStep[]): ActivationStep[] =>
    chain.map((step) =>
    {
        const multiplier = getCardDefinitionOrThrow(step.definitionId).stepDamageMultiplier ?? 1;

        if (multiplier <= 1 || step.damage <= 0)
        {
            return step;
        }

        return {
            ...step,
            damage: scaleBoostedValue(step.damage, multiplier),
        };
    });

/** Applies bomb conversion, streak stacking, boost bonuses, step multipliers, and poison armor replacement. */
export const resolveChainSteps = (chain: ActivationStep[]): ActivationStep[] =>
    applyStepDamageMultipliers(
        applyPoisonArmorReplacement(applyBoostBonuses(applyChainStacking(applyBombConversion(chain)))),
    );

export const resolveChainStep = (chain: ActivationStep[], index: number): ActivationStep =>
    resolveChainSteps(chain)[index]!;
