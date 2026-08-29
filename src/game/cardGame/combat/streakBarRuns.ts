import type { BoardModel } from '../domain/BoardModel';
import type { ActivationStep, SlotPosition } from '../domain/types';
import {
    createChainWalkState,
    getNextChainSlotFromStep,
    planChainPathPreview,
    tryBuildActivationStep,
} from './chainPathfinding';
import { collectComboTrails } from './comboTrailRegistry';
import {
    isTypeStackBehavior,
    slotsCanTypeStack,
    typeStackMultiplier,
} from './typeStack';

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

const formatTypeStackLabel = (multiplier: number): string =>
    `×${multiplier.toFixed(2).replace(/\.?0+$/, '') || multiplier}`;

/** Trail helpers only read `behaviorId` — cast preview steps for reuse. */
const asBehaviorChain = (steps: readonly StreakBarStep[]): ActivationStep[] =>
    steps as unknown as ActivationStep[];

/**
 * Adjacent same-type attack/defend runs (same tile or grid neighbors), plus combo trails
 * from `comboTrailRegistry` (Rad, Fire, …).
 */
export const findStreakBarRuns = (
    steps: readonly StreakBarStep[],
    minLength = 2,
): StreakBarRun[] =>
{
    const runs: StreakBarRun[] = [];
    const chain = asBehaviorChain(steps);
    const { hits: comboHits, consumed } = collectComboTrails(steps, chain, minLength);

    for (const hit of comboHits)
    {
        runs.push({
            behaviorId: hit.behaviorId,
            slots: hit.indices.map((index) => ({ ...steps[index]!.slot })),
            length: hit.indices.length,
            multiplier: 1,
            kind: 'combo',
            label: hit.label,
        });
    }

    let runBehavior: string | null = null;
    let runIndices: number[] = [];

    const flushTypeStack = (): void =>
    {
        if (runBehavior && runIndices.length >= minLength)
        {
            const length = runIndices.length;
            const multiplier = typeStackMultiplier(length);

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

        const step = steps[i]!;
        const behaviorId = step.behaviorId;

        if (!isTypeStackBehavior(behaviorId))
        {
            flushTypeStack();
            continue;
        }

        if (behaviorId === runBehavior)
        {
            const previous = steps[runIndices[runIndices.length - 1]!]!;

            if (slotsCanTypeStack(previous.slot, step.slot))
            {
                runIndices.push(i);
                continue;
            }

            // Same type in chain order, but not grid neighbors (e.g. leap) — new run.
            flushTypeStack();
            runBehavior = behaviorId;
            runIndices = [ i ];
            continue;
        }

        flushTypeStack();
        runBehavior = behaviorId;
        runIndices = [ i ];
    }

    flushTypeStack();

    return runs;
};

const runSignature = (run: StreakBarRun): string =>
    `${run.kind}:${run.behaviorId}:${run.slots.map((slot) => `${slot.row},${slot.col}`).join(';')}`;

const sameSlot = (a: SlotPosition, b: SlotPosition): boolean =>
    a.row === b.row && a.col === b.col;

/**
 * First cards of each local arrow-chain: occupied tiles that nothing else routes into.
 * Always includes `primaryStart` when occupied so the START route is considered.
 */
export const findBoardChainHeads = (
    board: BoardModel,
    primaryStart: SlotPosition,
): SlotPosition[] =>
{
    const occupied: SlotPosition[] = [];
    const pointedTo = new Set<string>();

    for (let row = 0; row < board.rows; row++)
    {
        for (let col = 0; col < board.cols; col++)
        {
            const slot = { row, col };
            const card = board.getCardAt(slot);

            if (!card)
            {
                continue;
            }

            occupied.push(slot);

            const walkState = createChainWalkState();
            const step = tryBuildActivationStep(board, slot, walkState);

            if (!step)
            {
                continue;
            }

            const next = getNextChainSlotFromStep(board, step);

            if (next)
            {
                pointedTo.add(`${next.row},${next.col}`);
            }
        }
    }

    const heads = occupied.filter((slot) => !pointedTo.has(`${slot.row},${slot.col}`));

    if (
        board.getCardAt(primaryStart)
        && !heads.some((slot) => sameSlot(slot, primaryStart))
    )
    {
        heads.unshift({ ...primaryStart });
    }

    return heads;
};

/**
 * Streak visuals from each local chain head — not mid-chain cards, and not only START.
 * Rad→Defend stays fused even when an Attack gap breaks the START route.
 * Overlapping type-stacks keep the longest run (so a side branch cannot steal cards
 * from a longer Attack/Defend streak).
 */
export const findAllStreakBarRuns = (
    board: BoardModel,
    primaryStart: SlotPosition,
): StreakBarRun[] =>
{
    const bySignature = new Map<string, StreakBarRun>();

    for (const head of findBoardChainHeads(board, primaryStart))
    {
        for (const run of findStreakBarRuns(planChainPathPreview(board, head).steps))
        {
            bySignature.set(runSignature(run), run);
        }
    }

    return dedupeOverlappingTypeStacks([ ...bySignature.values() ]);
};

/** Prefer longer type-stacks when two Attack/Defend runs share a slot. */
export const dedupeOverlappingTypeStacks = (
    runs: readonly StreakBarRun[],
): StreakBarRun[] =>
{
    const combos = runs.filter((run) => run.kind === 'combo');
    const typeStacks = runs
        .filter((run) => run.kind === 'type-stack')
        .slice()
        .sort((a, b) => b.length - a.length || b.multiplier - a.multiplier);

    const keptTypeStacks: StreakBarRun[] = [];
    const claimedSlots = new Set<string>();

    for (const run of typeStacks)
    {
        const keys = run.slots.map((slot) => `${slot.row},${slot.col}`);

        if (keys.some((key) => claimedSlots.has(key)))
        {
            continue;
        }

        keys.forEach((key) => claimedSlots.add(key));
        keptTypeStacks.push(run);
    }

    return [ ...keptTypeStacks, ...combos ];
};
