import { GAME_RULES } from '../config/cardRegistry';
import type { ActivationStep } from '../domain/types';

const STACKABLE_BEHAVIORS = new Set([ 'attack', 'defend' ]);

/** Skills that let a field boost keep propagating to the next card. */
const BOOST_PASS_THROUGH_BEHAVIORS = new Set([ 'joker', 'boost' ]);

export const isStreakNeutralBehavior = (behaviorId: string): boolean =>
    !STACKABLE_BEHAVIORS.has(behaviorId);

export const stepConsumesBoost = (step: ActivationStep): boolean =>
    !BOOST_PASS_THROUGH_BEHAVIORS.has(step.behaviorId);

/** Whether a field boost before this step still buffs it (next non-pass-through card only). */
export const hasBoostBeforeStep = (
    chain: readonly ActivationStep[],
    index: number,
): boolean =>
{
    let boostIndex = -1;

    for (let i = index - 1; i >= 0; i--)
    {
        if (chain[i]!.behaviorId === 'boost')
        {
            boostIndex = i;
            break;
        }
    }

    if (boostIndex < 0)
    {
        return false;
    }

    for (let i = boostIndex + 1; i < index; i++)
    {
        if (stepConsumesBoost(chain[i]!))
        {
            return false;
        }
    }

    return true;
};

export const getBoostMultiplierForStep = (
    chain: readonly ActivationStep[],
    index: number,
): number =>
    hasBoostBeforeStep(chain, index) ? GAME_RULES.fieldBoost.nextStepMultiplier : 1;

export const scaleBoostedValue = (value: number, multiplier: number): number =>
    multiplier > 1 ? Math.round(value * multiplier) : value;
