import { describe, expect, it } from 'vitest';
import { findStreakBarRuns } from './streakBarRuns';

describe('findStreakBarRuns', () =>
{
    it('merges contiguous attacks into a type-stack run with multiplier', () =>
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
        expect(runs[0]?.slots).toEqual([
            { row: 0, col: 0 },
            { row: 0, col: 1 },
            { row: 0, col: 2 },
        ]);
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
