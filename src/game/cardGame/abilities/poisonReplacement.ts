import type { ActivationStep } from '../domain/types';
import { hasAttackBetween, isTrailNeutralBehavior } from './chainTrailNeutrals';

/**
 * Defend steps poisoned by a poison card — each defend is evaluated independently so
 * fire/poison/joker cards between poison and the defend do not end the poison trail.
 * A defend is poisoned when no attack appears between poison and that defend.
 */
export const getDefendIndicesReplacedByPoison = (
    chain: readonly ActivationStep[],
    poisonIndex: number,
): number[] =>
{
    const replaced: number[] = [];

    for (let i = poisonIndex + 1; i < chain.length; i++)
    {
        const step = chain[i]!;

        if (isTrailNeutralBehavior(step.behaviorId))
        {
            continue;
        }

        if (step.behaviorId !== 'defend')
        {
            continue;
        }

        if (!hasAttackBetween(chain, poisonIndex, i))
        {
            replaced.push(i);
        }
    }

    return replaced;
};

export const getAllDefendIndicesReplacedByPoison = (
    chain: readonly ActivationStep[],
): Set<number> =>
{
    const replaced = new Set<number>();

    chain.forEach((step, index) =>
    {
        if (step.behaviorId !== 'poison')
        {
            return;
        }

        for (const defendIndex of getDefendIndicesReplacedByPoison(chain, index))
        {
            replaced.add(defendIndex);
        }
    });

    return replaced;
};

export const isArmorReplacedByPoison = (
    chain: readonly ActivationStep[],
    stepIndex: number,
): boolean => getAllDefendIndicesReplacedByPoison(chain).has(stepIndex);
