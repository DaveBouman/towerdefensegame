import { GAME_RULES } from '../config/cardRegistry';
import type { ActivationStep } from '../domain/types';

const STACKABLE_BEHAVIORS = new Set([ 'attack', 'defend' ]);

/** Skills that let boosts keep propagating (do not consume the pending stack). */
const BOOST_PASS_THROUGH_BEHAVIORS = new Set([ 'joker', 'boost' ]);

export const isStreakNeutralBehavior = (behaviorId: string): boolean =>
    !STACKABLE_BEHAVIORS.has(behaviorId);

export const stepConsumesBoost = (step: ActivationStep): boolean =>
    !BOOST_PASS_THROUGH_BEHAVIORS.has(step.behaviorId);

/**
 * Counts boost cards still pending for this step (walking back through jokers/boosts
 * until a consuming card). Each boost multiplies the next consumer.
 */
export const getBoostCountBeforeStep = (
    chain: readonly ActivationStep[],
    index: number,
): number =>
{
    let boostCount = 0;

    for (let i = index - 1; i >= 0; i--)
    {
        const step = chain[i]!;

        if (step.behaviorId === 'boost')
        {
            boostCount += 1;
            continue;
        }

        if (step.behaviorId === 'joker')
        {
            continue;
        }

        break;
    }

    return boostCount;
};

export const hasBoostBeforeStep = (
    chain: readonly ActivationStep[],
    index: number,
): boolean =>
    getBoostCountBeforeStep(chain, index) > 0;

/** Stacked boosts multiply: Boost→Boost→Attack with ×2 base → ×4. */
export const getBoostMultiplierForStep = (
    chain: readonly ActivationStep[],
    index: number,
): number =>
{
    const boostCount = getBoostCountBeforeStep(chain, index);

    if (boostCount <= 0)
    {
        return 1;
    }

    const base = GAME_RULES.fieldBoost.nextStepMultiplier;

    return base ** boostCount;
};

export const scaleBoostedValue = (value: number, multiplier: number): number =>
    multiplier > 1 ? Math.round(value * multiplier) : value;

/** Scales fractional battle-mod deltas (e.g. Hardwire +10% → +20% under ×2 boost). */
export const scaleBoostedDelta = (delta: number, multiplier: number): number =>
{
    if (multiplier <= 1 || delta === 0)
    {
        return delta;
    }

    return Math.round(delta * multiplier * 1000) / 1000;
};
