import { describe, expect, it } from 'vitest';
import { findStreakBarRuns } from './streakBarRuns';

describe('findStreakBarRuns', () =>
{
    it('merges contiguous attacks into one bar with type-stack multiplier', () =>
    {
        const runs = findStreakBarRuns([
            { slot: { row: 0, col: 0 }, behaviorId: 'attack' },
            { slot: { row: 0, col: 1 }, behaviorId: 'attack' },
            { slot: { row: 0, col: 2 }, behaviorId: 'attack' },
            { slot: { row: 0, col: 3 }, behaviorId: 'defend' },
        ]);

        expect(runs).toHaveLength(1);
        expect(runs[0]?.behaviorId).toBe('attack');
        expect(runs[0]?.length).toBe(3);
        expect(runs[0]?.multiplier).toBeCloseTo(1.3);
    });

    it('breaks the visual bar on skills even if rules streak could continue', () =>
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
