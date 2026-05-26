import { describe, expect, it } from 'vitest';
import {
    edgeToEdgeDistance,
    isWithinAttackRange,
    rangeIndicatorRadiusPx,
} from './combatRange';

const unit = (x: number, y: number, half = 24) => ({
    position: { x, y },
    bodyHalfWidth: half,
    bodyHalfHeight: half,
});

describe('combatRange', () =>
{
    it('measures gap between hitbox edges', () =>
    {
        const gap = edgeToEdgeDistance(unit(0, 0), unit(80, 0));

        expect(gap).toBe(32);
    });

    it('allows attack when edge gap is within range', () =>
    {
        const attacker = unit(0, 0);
        const target = unit(80, 0);
        const rangePx = 80;

        expect(isWithinAttackRange(attacker, target, rangePx)).toBe(true);
        expect(isWithinAttackRange(attacker, target, 31)).toBe(false);
    });

    it('range ring edge matches max combat reach for equal-sized units', () =>
    {
        const half = 24;
        const rangePx = 80;
        const attacker = unit(0, 0, half);
        const ringRadius = rangeIndicatorRadiusPx(rangePx, half, half, half, half);
        const targetAtRingEdge = unit(ringRadius, 0, half);

        expect(edgeToEdgeDistance(attacker, targetAtRingEdge)).toBe(rangePx);
        expect(isWithinAttackRange(attacker, targetAtRingEdge, rangePx)).toBe(true);
        expect(isWithinAttackRange(attacker, unit(ringRadius + 1, 0, half), rangePx)).toBe(false);
    });
});
