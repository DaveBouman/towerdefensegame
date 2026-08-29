import type { ActivationStep } from '../domain/types';

const ALTERNATING_BEHAVIORS = new Set([ 'attack', 'defend' ]);

/**
 * Indices of attack/defend steps after `fromIndex` while behaviors strictly alternate
 * (skills are skipped). Empty when the alternation never starts.
 */
export const getAlternatingAttackDefendIndicesAfter = (
    chain: readonly ActivationStep[],
    fromIndex: number,
): number[] =>
{
    const indices: number[] = [];
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
            indices.push(i);
            expectedNext = behaviorId === 'attack' ? 'defend' : 'attack';
            continue;
        }

        if (behaviorId !== expectedNext)
        {
            break;
        }

        indices.push(i);
        expectedNext = behaviorId === 'attack' ? 'defend' : 'attack';
    }

    return indices;
};

/** Attack/defend steps after `fromIndex` while behaviors strictly alternate (skills are skipped). */
export const countAlternatingAttackDefendAfter = (
    chain: readonly ActivationStep[],
    fromIndex: number,
): number =>
    getAlternatingAttackDefendIndicesAfter(chain, fromIndex).length;

export const computeFireAlternationBonus = (
    alternatingSteps: number,
    bonusPerStep: number,
): number =>
    alternatingSteps >= 2 ? (alternatingSteps - 1) * bonusPerStep : 0;
