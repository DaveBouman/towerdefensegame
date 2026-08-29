import { describe, expect, it } from 'vitest';
import type { ActivationStep } from '../domain/types';
import {
    areSlotsAdjacent,
    computeStreakAtIndex,
    slotsCanTypeStack,
    typeStackMultiplier,
} from './typeStack';

const attackStep = (slot: { row: number; col: number }, damage = 5): ActivationStep =>
    ({
        slot,
        card: {
            instanceId: `atk-${slot.row}-${slot.col}`,
            definitionId: 'attack',
            arrow: 'right',
        },
        definitionId: 'attack',
        behaviorId: 'attack',
        visualId: 'attack',
        arrow: 'right',
        exitArrow: 'right',
        damage,
        armor: 0,
    });

const defendStep = (slot: { row: number; col: number }, armor = 3): ActivationStep =>
    ({
        slot,
        card: {
            instanceId: `def-${slot.row}-${slot.col}`,
            definitionId: 'defend',
            arrow: 'right',
        },
        definitionId: 'defend',
        behaviorId: 'defend',
        visualId: 'defend',
        arrow: 'right',
        exitArrow: 'right',
        damage: 0,
        armor,
    });

const skillStep = (slot: { row: number; col: number }, behaviorId = 'boost'): ActivationStep =>
    ({
        slot,
        card: {
            instanceId: `sk-${slot.row}-${slot.col}`,
            definitionId: behaviorId,
            arrow: 'right',
        },
        definitionId: behaviorId,
        behaviorId,
        visualId: behaviorId,
        arrow: 'right',
        exitArrow: 'right',
        damage: 0,
        armor: 0,
    });

describe('areSlotsAdjacent', () =>
{
    it('accepts orthogonal and diagonal neighbors', () =>
    {
        expect(areSlotsAdjacent({ row: 1, col: 1 }, { row: 1, col: 2 })).toBe(true);
        expect(areSlotsAdjacent({ row: 1, col: 1 }, { row: 0, col: 0 })).toBe(true);
    });

    it('rejects the same tile and leaps', () =>
    {
        expect(areSlotsAdjacent({ row: 1, col: 1 }, { row: 1, col: 1 })).toBe(false);
        expect(areSlotsAdjacent({ row: 0, col: 0 }, { row: 0, col: 2 })).toBe(false);
    });
});

describe('slotsCanTypeStack', () =>
{
    it('allows the same tile for Strike-style revisits', () =>
    {
        expect(slotsCanTypeStack({ row: 1, col: 1 }, { row: 1, col: 1 })).toBe(true);
    });

    it('rejects leaps', () =>
    {
        expect(slotsCanTypeStack({ row: 0, col: 0 }, { row: 0, col: 2 })).toBe(false);
    });
});

describe('computeStreakAtIndex', () =>
{
    it('stacks adjacent same-type cards', () =>
    {
        const chain = [
            attackStep({ row: 0, col: 0 }),
            attackStep({ row: 0, col: 1 }),
            attackStep({ row: 0, col: 2 }),
        ];

        expect(computeStreakAtIndex(chain, 0)).toBe(1);
        expect(computeStreakAtIndex(chain, 1)).toBe(2);
        expect(computeStreakAtIndex(chain, 2)).toBe(3);
        expect(typeStackMultiplier(3)).toBeCloseTo(1.3);
    });

    it('stacks a revisit on the same tile', () =>
    {
        const chain = [
            attackStep({ row: 0, col: 1 }),
            attackStep({ row: 0, col: 1 }),
        ];

        expect(computeStreakAtIndex(chain, 1)).toBe(2);
    });

    it('stacks diagonal Strike-style neighbors', () =>
    {
        const chain = [
            attackStep({ row: 0, col: 0 }),
            attackStep({ row: 1, col: 1 }),
        ];

        expect(computeStreakAtIndex(chain, 1)).toBe(2);
        expect(typeStackMultiplier(2)).toBeCloseTo(1.15);
    });

    it('does not stack chain-sequential cards that are not grid neighbors (leap gap)', () =>
    {
        const chain = [
            attackStep({ row: 0, col: 0 }),
            attackStep({ row: 0, col: 2 }),
        ];

        expect(computeStreakAtIndex(chain, 0)).toBe(1);
        expect(computeStreakAtIndex(chain, 1)).toBe(1);
    });

    it('skips skills but still requires adjacency between stackable steps', () =>
    {
        const chain = [
            attackStep({ row: 0, col: 0 }),
            skillStep({ row: 0, col: 1 }, 'joker'),
            attackStep({ row: 0, col: 2 }),
        ];

        expect(computeStreakAtIndex(chain, 2)).toBe(1);
    });

    it('stacks through a skill when the attacks share an edge or corner', () =>
    {
        const chain = [
            attackStep({ row: 0, col: 0 }),
            skillStep({ row: 1, col: 0 }, 'boost'),
            attackStep({ row: 0, col: 1 }),
        ];

        expect(computeStreakAtIndex(chain, 2)).toBe(2);
    });

    it('resets when the stackable behavior changes', () =>
    {
        const chain = [
            attackStep({ row: 0, col: 0 }),
            defendStep({ row: 0, col: 1 }),
            attackStep({ row: 0, col: 2 }),
        ];

        expect(computeStreakAtIndex(chain, 2)).toBe(1);
    });

    it('stacks adjacent defends the same way as attacks', () =>
    {
        const chain = [
            defendStep({ row: 2, col: 2 }),
            defendStep({ row: 2, col: 3 }),
        ];

        expect(computeStreakAtIndex(chain, 1)).toBe(2);
    });
});
