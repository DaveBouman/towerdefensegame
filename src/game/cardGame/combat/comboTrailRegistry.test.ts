import { describe, expect, it } from 'vitest';
import type { ActivationStep } from '../domain/types';
import {
    COMBO_TRAIL_DETECTORS,
    collectComboTrails,
    type ComboTrailStep,
} from './comboTrailRegistry';

const asChain = (steps: readonly ComboTrailStep[]): ActivationStep[] =>
    steps as unknown as ActivationStep[];

describe('COMBO_TRAIL_DETECTORS', () =>
{
    it('registers Rad and Fire trail detectors', () =>
    {
        expect(COMBO_TRAIL_DETECTORS.map((detector) => detector.id).sort()).toEqual([
            'fire-trail',
            'rad-trail',
        ]);
    });

    it('keeps starter behavior ids unique per detector id', () =>
    {
        const ids = new Set(COMBO_TRAIL_DETECTORS.map((detector) => detector.id));

        expect(ids.size).toBe(COMBO_TRAIL_DETECTORS.length);
    });
});

describe('collectComboTrails', () =>
{
    it('finds a Rad→Defend trail and marks those steps consumed', () =>
    {
        const steps: ComboTrailStep[] = [
            { slot: { row: 0, col: 0 }, behaviorId: 'poison' },
            { slot: { row: 0, col: 1 }, behaviorId: 'defend' },
            { slot: { row: 0, col: 2 }, behaviorId: 'defend' },
            { slot: { row: 0, col: 3 }, behaviorId: 'attack' },
        ];

        const { hits, consumed } = collectComboTrails(steps, asChain(steps));

        expect(hits).toHaveLength(1);
        expect(hits[0]?.label).toBe('RAD→2');
        expect(hits[0]?.indices).toEqual([ 0, 1, 2 ]);
        expect([ ...consumed ].sort()).toEqual([ 0, 1, 2 ]);
    });

    it('finds a Fire alternation trail', () =>
    {
        const steps: ComboTrailStep[] = [
            { slot: { row: 1, col: 0 }, behaviorId: 'fire' },
            { slot: { row: 1, col: 1 }, behaviorId: 'attack' },
            { slot: { row: 1, col: 2 }, behaviorId: 'defend' },
            { slot: { row: 1, col: 3 }, behaviorId: 'attack' },
        ];

        const { hits } = collectComboTrails(steps, asChain(steps));

        expect(hits.some((hit) => hit.behaviorId === 'fire' && hit.label === 'FIRE→3')).toBe(true);
    });
});
