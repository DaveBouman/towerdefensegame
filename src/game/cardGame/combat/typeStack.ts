import { GAME_RULES } from '../config/cardRegistry';
import type { ActivationStep, SlotPosition } from '../domain/types';

/** Attack/Defend type-stack behaviors (damage/armor +15% per duplicate). */
const TYPE_STACK_BEHAVIORS = new Set([ 'attack', 'defend' ]);

export const isTypeStackBehavior = (behaviorId: string): boolean =>
    TYPE_STACK_BEHAVIORS.has(behaviorId);

/** Non-stackable steps (skills, boosts, …) — skipped while counting a type streak. */
export const isStreakNeutralBehavior = (behaviorId: string): boolean =>
    !isTypeStackBehavior(behaviorId);

/**
 * Whether two chain steps may extend a type stack: same tile (revisit / Strike loop)
 * or grid-adjacent. Chain-sequential leaps (Δ≥2) do not qualify.
 */
export const slotsCanTypeStack = (a: SlotPosition, b: SlotPosition): boolean =>
{
    const rowDelta = Math.abs(a.row - b.row);
    const colDelta = Math.abs(a.col - b.col);

    return rowDelta <= 1 && colDelta <= 1;
};

/** Orthogonal or diagonal neighbors (excludes the same tile). */
export const areSlotsAdjacent = (a: SlotPosition, b: SlotPosition): boolean =>
    slotsCanTypeStack(a, b) && (a.row !== b.row || a.col !== b.col);

export const typeStackMultiplier = (streak: number): number =>
{
    if (streak <= 1)
    {
        return 1;
    }

    return 1 + (streak - 1) * GAME_RULES.typeStackBonus.perDuplicate;
};

/**
 * Contiguous same-type Attack/Defend length ending at `index`.
 * Skills in between do not reset the behavior, but each stackable step must be the
 * same tile (revisit) or grid-adjacent to the previous stackable step — chain order
 * alone is not enough (leaps / distant same-type cards do not stack).
 */
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
    let lastStackSlot: SlotPosition | null = null;

    for (let i = 0; i <= index; i++)
    {
        const current = chain[i]!;

        if (isStreakNeutralBehavior(current.behaviorId))
        {
            continue;
        }

        if (
            current.behaviorId === streakBehavior
            && lastStackSlot
            && slotsCanTypeStack(lastStackSlot, current.slot)
        )
        {
            streak += 1;
        }
        else
        {
            streakBehavior = current.behaviorId;
            streak = 1;
        }

        lastStackSlot = current.slot;
    }

    return streak;
};
