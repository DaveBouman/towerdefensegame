import { GAME_RULES } from '../config/cardRegistry';
import type { SlotPosition } from '../domain/types';

const STACKABLE_BEHAVIORS = new Set([ 'attack', 'defend' ]);

export interface StreakBarStep
{
    slot: SlotPosition;
    behaviorId: string;
}

export interface StreakBarRun
{
    behaviorId: string;
    slots: SlotPosition[];
    length: number;
    multiplier: number;
}

const streakToMultiplier = (streak: number): number =>
{
    if (streak <= 1)
    {
        return 1;
    }

    return 1 + (streak - 1) * GAME_RULES.typeStackBonus.perDuplicate;
};

/**
 * Contiguous same-type attack/defend runs along the planned chain.
 * Skills between cards break the *visual* bar (even if rules streak continues).
 * Bars start at length 2 — that's when type-stack bonus kicks in.
 */
export const findStreakBarRuns = (
    steps: readonly StreakBarStep[],
    minLength = 2,
): StreakBarRun[] =>
{
    const runs: StreakBarRun[] = [];
    let runBehavior: string | null = null;
    let runSlots: SlotPosition[] = [];

    const flush = (): void =>
    {
        if (runBehavior && runSlots.length >= minLength)
        {
            const length = runSlots.length;

            runs.push({
                behaviorId: runBehavior,
                slots: runSlots.map((slot) => ({ ...slot })),
                length,
                multiplier: streakToMultiplier(length),
            });
        }

        runBehavior = null;
        runSlots = [];
    };

    for (const step of steps)
    {
        if (!STACKABLE_BEHAVIORS.has(step.behaviorId))
        {
            flush();
            continue;
        }

        if (step.behaviorId === runBehavior)
        {
            runSlots.push({ ...step.slot });
            continue;
        }

        flush();
        runBehavior = step.behaviorId;
        runSlots = [ { ...step.slot } ];
    }

    flush();

    return runs;
};
