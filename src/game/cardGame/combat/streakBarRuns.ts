import { GAME_RULES } from '../config/cardRegistry';
import type { ActivationStep, SlotPosition } from '../domain/types';
import { countAlternatingAttackDefendAfter } from '../abilities/fireAlternation';
import { getDefendIndicesReplacedByPoison } from '../abilities/poisonReplacement';

/** Real type-stack damage/armor bonus (+15% per dupe). */
const TYPE_STACK_BEHAVIORS = new Set([ 'attack', 'defend' ]);

export interface StreakBarStep
{
    slot: SlotPosition;
    behaviorId: string;
}

export type StreakBarKind = 'type-stack' | 'combo';

export interface StreakBarRun
{
    behaviorId: string;
    slots: SlotPosition[];
    length: number;
    /** Type-stack damage mult, or 1 for combo trails. */
    multiplier: number;
    kind: StreakBarKind;
    /** Short HUD label — `×1.3` or `RAD→2`. */
    label: string;
}

const streakToMultiplier = (streak: number): number =>
{
    if (streak <= 1)
    {
        return 1;
    }

    return 1 + (streak - 1) * GAME_RULES.typeStackBonus.perDuplicate;
};

const formatTypeStackLabel = (multiplier: number): string =>
    `×${multiplier.toFixed(2).replace(/\.?0+$/, '') || multiplier}`;

/** Trail helpers only read `behaviorId` — cast preview steps for reuse. */
const asBehaviorChain = (steps: readonly StreakBarStep[]): ActivationStep[] =>
    steps as unknown as ActivationStep[];

/**
 * Contiguous same-type attack/defend runs, plus logical combo trails:
 * - Rad → following Defends it converts (until an Attack)
 * - Fire → following alternating Attack/Defend that pay the fire bonus
 */
export const findStreakBarRuns = (
    steps: readonly StreakBarStep[],
    minLength = 2,
): StreakBarRun[] =>
{
    const runs: StreakBarRun[] = [];
    const consumed = new Set<number>();
    const chain = asBehaviorChain(steps);

    for (let i = 0; i < steps.length; i++)
    {
        const step = steps[i]!;

        if (step.behaviorId === 'poison')
        {
            const defendIndices = getDefendIndicesReplacedByPoison(chain, i);
            const indices = [ i, ...defendIndices ];

            if (indices.length >= minLength)
            {
                indices.forEach((index) => consumed.add(index));
                const armorCount = defendIndices.length;

                runs.push({
                    behaviorId: 'poison',
                    slots: indices.map((index) => ({ ...steps[index]!.slot })),
                    length: indices.length,
                    multiplier: 1,
                    kind: 'combo',
                    label: armorCount > 0 ? `RAD→${armorCount}` : `RAD×${indices.length}`,
                });
            }
        }

        if (step.behaviorId === 'fire')
        {
            const alternating = countAlternatingAttackDefendAfter(chain, i);

            if (alternating >= 2)
            {
                const indices = [ i ];
                let expectedNext: 'attack' | 'defend' | null = null;
                let taken = 0;

                for (let j = i + 1; j < steps.length && taken < alternating; j++)
                {
                    const behaviorId = steps[j]!.behaviorId;

                    if (behaviorId !== 'attack' && behaviorId !== 'defend')
                    {
                        continue;
                    }

                    if (expectedNext === null)
                    {
                        indices.push(j);
                        expectedNext = behaviorId === 'attack' ? 'defend' : 'attack';
                        taken += 1;
                        continue;
                    }

                    if (behaviorId !== expectedNext)
                    {
                        break;
                    }

                    indices.push(j);
                    expectedNext = behaviorId === 'attack' ? 'defend' : 'attack';
                    taken += 1;
                }

                if (indices.length >= minLength)
                {
                    indices.forEach((index) => consumed.add(index));
                    runs.push({
                        behaviorId: 'fire',
                        slots: indices.map((index) => ({ ...steps[index]!.slot })),
                        length: indices.length,
                        multiplier: 1,
                        kind: 'combo',
                        label: `FIRE→${alternating}`,
                    });
                }
            }
        }
    }

    let runBehavior: string | null = null;
    let runIndices: number[] = [];

    const flushTypeStack = (): void =>
    {
        if (runBehavior && runIndices.length >= minLength)
        {
            const length = runIndices.length;
            const multiplier = streakToMultiplier(length);

            runs.push({
                behaviorId: runBehavior,
                slots: runIndices.map((index) => ({ ...steps[index]!.slot })),
                length,
                multiplier,
                kind: 'type-stack',
                label: formatTypeStackLabel(multiplier),
            });
        }

        runBehavior = null;
        runIndices = [];
    };

    for (let i = 0; i < steps.length; i++)
    {
        if (consumed.has(i))
        {
            flushTypeStack();
            continue;
        }

        const behaviorId = steps[i]!.behaviorId;

        if (!TYPE_STACK_BEHAVIORS.has(behaviorId))
        {
            flushTypeStack();
            continue;
        }

        if (behaviorId === runBehavior)
        {
            runIndices.push(i);
            continue;
        }

        flushTypeStack();
        runBehavior = behaviorId;
        runIndices = [ i ];
    }

    flushTypeStack();

    return runs;
};
