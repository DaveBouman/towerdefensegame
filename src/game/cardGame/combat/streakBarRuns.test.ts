import { describe, expect, it } from 'vitest';
import { BoardModel, createEmptyBoard } from '../domain/BoardModel';
import { createCardInstance } from '../domain/createCardInstance';
import { GRID_CONFIG } from '../../config/gridConfig';
import {
    dedupeOverlappingTypeStacks,
    findAllStreakBarRuns,
    findBoardChainHeads,
    findStreakBarRuns,
    type StreakBarRun,
} from './streakBarRuns';

describe('findStreakBarRuns', () =>
{
    it('merges contiguous adjacent attacks into a type-stack run with multiplier', () =>
    {
        const runs = findStreakBarRuns([
            { slot: { row: 0, col: 0 }, behaviorId: 'attack' },
            { slot: { row: 0, col: 1 }, behaviorId: 'attack' },
            { slot: { row: 0, col: 2 }, behaviorId: 'attack' },
            { slot: { row: 0, col: 3 }, behaviorId: 'defend' },
        ]);

        expect(runs).toHaveLength(1);
        expect(runs[0]?.behaviorId).toBe('attack');
        expect(runs[0]?.kind).toBe('type-stack');
        expect(runs[0]?.length).toBe(3);
        expect(runs[0]?.multiplier).toBeCloseTo(1.3);
        expect(runs[0]?.label).toBe('×1.3');
    });

    it('does not type-stack chain-sequential attacks that are not grid neighbors', () =>
    {
        const runs = findStreakBarRuns([
            { slot: { row: 0, col: 0 }, behaviorId: 'attack' },
            { slot: { row: 0, col: 2 }, behaviorId: 'attack' },
        ]);

        expect(runs).toEqual([]);
    });

    it('type-stacks diagonal neighbors', () =>
    {
        const runs = findStreakBarRuns([
            { slot: { row: 0, col: 0 }, behaviorId: 'attack' },
            { slot: { row: 1, col: 1 }, behaviorId: 'attack' },
        ]);

        expect(runs).toHaveLength(1);
        expect(runs[0]?.length).toBe(2);
        expect(runs[0]?.label).toBe('×1.15');
    });

    it('extends Rad combo through following Defends (armor trail)', () =>
    {
        const runs = findStreakBarRuns([
            { slot: { row: 0, col: 0 }, behaviorId: 'poison' },
            { slot: { row: 0, col: 1 }, behaviorId: 'defend' },
            { slot: { row: 0, col: 2 }, behaviorId: 'defend' },
            { slot: { row: 0, col: 3 }, behaviorId: 'attack' },
        ]);

        expect(runs).toHaveLength(1);
        expect(runs[0]?.kind).toBe('combo');
        expect(runs[0]?.behaviorId).toBe('poison');
        expect(runs[0]?.length).toBe(3);
        expect(runs[0]?.label).toBe('RAD→2');
    });

    it('extends Fire combo through alternating Attack/Defend', () =>
    {
        const runs = findStreakBarRuns([
            { slot: { row: 1, col: 0 }, behaviorId: 'fire' },
            { slot: { row: 1, col: 1 }, behaviorId: 'attack' },
            { slot: { row: 1, col: 2 }, behaviorId: 'defend' },
            { slot: { row: 1, col: 3 }, behaviorId: 'attack' },
        ]);

        expect(runs.some((run) => run.behaviorId === 'fire' && run.label === 'FIRE→3')).toBe(true);
    });

    it('breaks type-stack visuals on skills', () =>
    {
        const runs = findStreakBarRuns([
            { slot: { row: 0, col: 0 }, behaviorId: 'attack' },
            { slot: { row: 0, col: 1 }, behaviorId: 'boost' },
            { slot: { row: 0, col: 2 }, behaviorId: 'attack' },
            { slot: { row: 0, col: 3 }, behaviorId: 'attack' },
        ]);

        expect(runs).toHaveLength(1);
        expect(runs[0]?.length).toBe(2);
        expect(runs[0]?.slots[0]).toEqual({ row: 0, col: 2 });
    });

    it('ignores single cards', () =>
    {
        expect(findStreakBarRuns([
            { slot: { row: 0, col: 0 }, behaviorId: 'attack' },
            { slot: { row: 0, col: 1 }, behaviorId: 'defend' },
        ])).toEqual([]);
    });
});

describe('dedupeOverlappingTypeStacks', () =>
{
    const stack = (
        slots: { row: number; col: number }[],
        multiplier: number,
    ): StreakBarRun =>
        ({
            behaviorId: 'attack',
            slots,
            length: slots.length,
            multiplier,
            kind: 'type-stack',
            label: `×${multiplier}`,
        });

    it('keeps the longer type-stack when runs share a slot', () =>
    {
        const longer = stack([
            { row: 0, col: 0 },
            { row: 0, col: 1 },
            { row: 0, col: 2 },
        ], 1.3);
        const sideBranch = stack([
            { row: 0, col: 2 },
            { row: 1, col: 2 },
        ], 1.15);

        const result = dedupeOverlappingTypeStacks([ sideBranch, longer ]);

        expect(result).toHaveLength(1);
        expect(result[0]?.length).toBe(3);
        expect(result[0]?.multiplier).toBe(1.3);
    });

    it('keeps non-overlapping type-stacks and combo trails', () =>
    {
        const a = stack([ { row: 0, col: 0 }, { row: 0, col: 1 } ], 1.15);
        const b = stack([ { row: 2, col: 0 }, { row: 2, col: 1 } ], 1.15);
        const combo: StreakBarRun = {
            behaviorId: 'poison',
            slots: [ { row: 1, col: 3 }, { row: 1, col: 4 } ],
            length: 2,
            multiplier: 1,
            kind: 'combo',
            label: 'RAD→1',
        };

        const result = dedupeOverlappingTypeStacks([ a, b, combo ]);

        expect(result.filter((run) => run.kind === 'type-stack')).toHaveLength(2);
        expect(result.some((run) => run.kind === 'combo')).toBe(true);
    });
});

describe('findAllStreakBarRuns', () =>
{
    it('starts each local chain at its head, not mid-chain cards', () =>
    {
        const board = new BoardModel(createEmptyBoard(GRID_CONFIG.rows, GRID_CONFIG.cols));

        board.placeCard({ row: 0, col: 0 }, createCardInstance('attack', 'right'));
        // gap — START chain dies
        board.placeCard({ row: 0, col: 2 }, createCardInstance('attack', 'right'));
        board.placeCard({ row: 0, col: 3 }, createCardInstance('poison', 'right'));
        board.placeCard({ row: 0, col: 4 }, createCardInstance('defend', 'down'));
        board.placeCard({ row: 1, col: 4 }, createCardInstance('defend', 'left'));

        const heads = findBoardChainHeads(board, { row: 0, col: 0 });

        expect(heads.some((slot) => slot.row === 0 && slot.col === 0)).toBe(true);
        expect(heads.some((slot) => slot.row === 0 && slot.col === 2)).toBe(true);
        // Rad is pointed at by the Attack at col 2 — not a head
        expect(heads.some((slot) => slot.row === 0 && slot.col === 3)).toBe(false);
        // Defends are mid-chain
        expect(heads.some((slot) => slot.row === 0 && slot.col === 4)).toBe(false);

        const runs = findAllStreakBarRuns(board, { row: 0, col: 0 });
        const rad = runs.find((run) => run.behaviorId === 'poison');

        expect(rad?.label).toBe('RAD→2');
        expect(rad?.slots).toEqual([
            { row: 0, col: 3 },
            { row: 0, col: 4 },
            { row: 1, col: 4 },
        ]);
    });

    it('prefers the longer Attack row over a side branch into the same tile', () =>
    {
        const board = new BoardModel(createEmptyBoard(GRID_CONFIG.rows, GRID_CONFIG.cols));

        // Horizontal Attack ×3
        board.placeCard({ row: 0, col: 0 }, createCardInstance('attack', 'right'));
        board.placeCard({ row: 0, col: 1 }, createCardInstance('attack', 'right'));
        board.placeCard({ row: 0, col: 2 }, createCardInstance('attack', 'right'));
        // Side branch into the third Attack
        board.placeCard({ row: 1, col: 2 }, createCardInstance('attack', 'up'));
        // Separate diagonal Strike → Attack pair
        board.placeCard({ row: 2, col: 0 }, createCardInstance('attack-special', 'down-right'));
        board.placeCard({ row: 3, col: 1 }, createCardInstance('attack', 'right'));

        const runs = findAllStreakBarRuns(board, { row: 0, col: 0 });
        const typeStacks = runs.filter((run) => run.kind === 'type-stack');

        expect(typeStacks.some((run) => run.length === 3 && run.label === '×1.3')).toBe(true);
        expect(typeStacks.some((run) =>
            run.length === 2
            && run.slots.some((slot) => slot.row === 2 && slot.col === 0)
            && run.slots.some((slot) => slot.row === 3 && slot.col === 1))).toBe(true);
        // Side branch must not claim a ×1.15 that steals the third tile from ×1.3
        expect(typeStacks.some((run) =>
            run.length === 2
            && run.slots.some((slot) => slot.row === 1 && slot.col === 2))).toBe(false);
    });

    it('does not type-stack a leap Attack onto a card two tiles away', () =>
    {
        const board = new BoardModel(createEmptyBoard(GRID_CONFIG.rows, GRID_CONFIG.cols));

        board.placeCard({ row: 0, col: 0 }, createCardInstance('attack-leap', 'right'));
        board.placeCard({ row: 0, col: 2 }, createCardInstance('attack', 'up'));

        const runs = findAllStreakBarRuns(board, { row: 0, col: 0 });

        expect(runs.filter((run) => run.kind === 'type-stack')).toEqual([]);
    });
});
