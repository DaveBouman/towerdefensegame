import { describe, expect, it } from 'vitest';
import { computeSeparationOffset } from './separation';

describe('computeSeparationOffset', () =>
{
    it('pushes overlapping units apart', () =>
    {
        const offset = computeSeparationOffset(
            'a',
            { x: 100, y: 100 },
            [ { id: 'b', position: { x: 108, y: 100 }, radius: 16 } ],
            16,
            10,
        );

        expect(offset.x).toBeLessThan(0);
        expect(Math.abs(offset.y)).toBeLessThan(0.01);
    });

    it('ignores distant units', () =>
    {
        const offset = computeSeparationOffset(
            'a',
            { x: 100, y: 100 },
            [ { id: 'b', position: { x: 300, y: 100 }, radius: 16 } ],
            16,
            10,
        );

        expect(offset.x).toBe(0);
        expect(offset.y).toBe(0);
    });
});
