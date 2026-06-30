import type { ActivationStep } from '../domain/types';

const STACKABLE_BEHAVIORS = new Set([ 'attack', 'defend' ]);

const isStreakNeutralBehavior = (behaviorId: string): boolean =>
    !STACKABLE_BEHAVIORS.has(behaviorId);

/** Defend steps after poison that lose armor until the next attack in the chain. */
export const getDefendIndicesReplacedByPoison = (
    chain: readonly ActivationStep[],
    poisonIndex: number,
): number[] =>
{
    const replaced: number[] = [];

    for (let i = poisonIndex + 1; i < chain.length; i++)
    {
        const step = chain[i]!;

        if (isStreakNeutralBehavior(step.behaviorId))
        {
            continue;
        }

        if (step.behaviorId === 'defend')
        {
            replaced.push(i);
            continue;
        }

        break;
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
