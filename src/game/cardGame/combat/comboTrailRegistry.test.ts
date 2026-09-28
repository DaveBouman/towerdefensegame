import { describe, expect, it } from 'vitest';
import type { ActivationStep } from '../domain/types';
import {
    COMBO_TRAIL_DETECTORS,
    collectComboTrails,
    type ComboTrailStep,
} from './comboTrailRegistry';

const asChain = (steps: readonly ComboTrailStep[]): ActivationStep[] =>
    steps.map((step, index) => ({
        slot: step.slot,
        card: {
            instanceId: `c${index}`,
            definitionId: step.definitionId ?? step.behaviorId,
            arrow: 'right' as const,
        },
        definitionId: step.definitionId ?? step.behaviorId,
        behaviorId: step.behaviorId,
        visualId: step.behaviorId,
        arrow: 'right' as const,
        exitArrow: 'right' as const,
        damage: 0,
        armor: 0,
    }));

describe('COMBO_TRAIL_DETECTORS', () =>
{
    it('registers Rad, Fire, Bleed, Fortify, and Overload trail detectors', () =>
    {
        expect(COMBO_TRAIL_DETECTORS.map((detector) => detector.id).sort()).toEqual([
            'bleed-trail',
            'fire-trail',
            'fortify-trail',
            'overload-trail',
            'rad-trail',
        ]);
    });

    it('keeps detector ids unique', () =>
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
            { slot: { row: 0, col: 0 }, behaviorId: 'poison', definitionId: 'poison' },
            { slot: { row: 0, col: 1 }, behaviorId: 'defend', definitionId: 'defend' },
            { slot: { row: 0, col: 2 }, behaviorId: 'defend', definitionId: 'defend' },
            { slot: { row: 0, col: 3 }, behaviorId: 'attack', definitionId: 'attack' },
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
            { slot: { row: 1, col: 0 }, behaviorId: 'fire', definitionId: 'fire' },
            { slot: { row: 1, col: 1 }, behaviorId: 'attack', definitionId: 'attack' },
            { slot: { row: 1, col: 2 }, behaviorId: 'defend', definitionId: 'defend' },
            { slot: { row: 1, col: 3 }, behaviorId: 'attack', definitionId: 'attack' },
        ];

        const { hits } = collectComboTrails(steps, asChain(steps));

        expect(hits.some((hit) => hit.behaviorId === 'fire' && hit.label === 'FIRE→3')).toBe(true);
    });

    it('finds a Bleed trail when attacks exceed the threshold', () =>
    {
        const steps: ComboTrailStep[] = [
            { slot: { row: 0, col: 0 }, behaviorId: 'attack', definitionId: 'rupture' },
            { slot: { row: 0, col: 1 }, behaviorId: 'attack', definitionId: 'attack' },
            { slot: { row: 0, col: 2 }, behaviorId: 'attack', definitionId: 'attack' },
        ];

        const { hits } = collectComboTrails(steps, asChain(steps));

        expect(hits.some((hit) => hit.behaviorId === 'bleed' && hit.label === 'BLEED→1')).toBe(true);
    });

    it('finds a Fortify trail when defends exceed the threshold', () =>
    {
        const steps: ComboTrailStep[] = [
            { slot: { row: 0, col: 0 }, behaviorId: 'defend', definitionId: 'bulwark' },
            { slot: { row: 0, col: 1 }, behaviorId: 'defend', definitionId: 'defend' },
            { slot: { row: 0, col: 2 }, behaviorId: 'defend', definitionId: 'defend' },
        ];

        const { hits } = collectComboTrails(steps, asChain(steps));

        expect(hits.some((hit) => hit.behaviorId === 'fortify' && hit.label === 'FORT→1')).toBe(true);
    });

    it('finds an Overload trail when other ability cards are present', () =>
    {
        const steps: ComboTrailStep[] = [
            { slot: { row: 0, col: 0 }, behaviorId: 'fire', definitionId: 'fire' },
            { slot: { row: 0, col: 1 }, behaviorId: 'attack', definitionId: 'surge' },
        ];

        const { hits } = collectComboTrails(steps, asChain(steps));

        expect(hits.some((hit) => hit.behaviorId === 'overload' && hit.label.startsWith('OVL '))).toBe(true);
    });
});
