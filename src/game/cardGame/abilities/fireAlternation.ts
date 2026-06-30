import type { ActivationStep } from '../domain/types';
import { hasAttackBetween, isTrailNeutralBehavior } from './chainTrailNeutrals';

const ALTERNATING_BEHAVIORS = new Set([ 'attack', 'defend' ]);

/** Attack/defend steps after `fromIndex` while behaviors strictly alternate (skills are skipped). */
export const countAlternatingAttackDefendAfter = (
    chain: readonly ActivationStep[],
    fromIndex: number,
): number =>
{
    let runLength = 0;
    let expectedNext: 'attack' | 'defend' | null = null;

    for (let i = fromIndex + 1; i < chain.length; i++)
    {
        const behaviorId = chain[i]!.behaviorId;

        if (!ALTERNATING_BEHAVIORS.has(behaviorId))
        {
            continue;
        }

        if (expectedNext === null)
        {
            runLength = 1;
            expectedNext = behaviorId === 'attack' ? 'defend' : 'attack';
            continue;
        }

        if (behaviorId === expectedNext)
        {
            runLength += 1;
            expectedNext = behaviorId === 'attack' ? 'defend' : 'attack';
        }
        else
        {
            break;
        }
    }

    return runLength;
};

export const computeFireAlternationBonus = (
    alternatingSteps: number,
    bonusPerStep: number,
): number =>
    alternatingSteps >= 2 ? (alternatingSteps - 1) * bonusPerStep : 0;
