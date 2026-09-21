import { describe, expect, it } from 'vitest';
import { buildBalancedDirectionsForPool, buildForwardBiasedDirectionsForPool, ORTHOGONAL_DIRECTIONS } from './cardDirections';

describe('buildBalancedDirectionsForPool', () =>
{
    it('assigns an equal count for each direction in the pool', () =>
    {
        const directions = buildBalancedDirectionsForPool('orthogonal', 12, (items) => [ ...items ]);

        for (const direction of ORTHOGONAL_DIRECTIONS)
        {
            expect(directions.filter((arrow) => arrow === direction)).toHaveLength(6);
        }
    });

    it('distributes remainder directions when count is not divisible', () =>
    {
        const directions = buildBalancedDirectionsForPool('orthogonal', 5, (items) => [ ...items ]);

        expect(directions).toHaveLength(5);
        expect(new Set(directions).size).toBeGreaterThan(1);
    });
});

describe('buildForwardBiasedDirectionsForPool', () =>
{
    it('assigns only right and down for orthogonal pools', () =>
    {
        const directions = buildForwardBiasedDirectionsForPool('orthogonal', 18, (items) => [ ...items ]);

        expect(directions.filter((arrow) => arrow === 'right')).toHaveLength(9);
        expect(directions.filter((arrow) => arrow === 'down')).toHaveLength(9);
        expect(directions.every((arrow) => arrow === 'right' || arrow === 'down')).toBe(true);
    });

    it('assigns only down-right for diagonal pools', () =>
    {
        const directions = buildForwardBiasedDirectionsForPool('diagonal', 6, (items) => [ ...items ]);

        expect(directions).toHaveLength(6);
        expect(directions.every((arrow) => arrow === 'down-right')).toBe(true);
    });
});
