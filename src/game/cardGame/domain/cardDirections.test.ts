import { describe, expect, it } from 'vitest';
import { buildBalancedDirectionsForPool, ORTHOGONAL_DIRECTIONS } from './cardDirections';

describe('buildBalancedDirectionsForPool', () =>
{
    it('assigns an equal count for each direction in the pool', () =>
    {
        const directions = buildBalancedDirectionsForPool('orthogonal', 12, (items) => [ ...items ]);

        for (const direction of ORTHOGONAL_DIRECTIONS)
        {
            expect(directions.filter((arrow) => arrow === direction)).toHaveLength(3);
        }
    });

    it('distributes remainder directions when count is not divisible', () =>
    {
        const directions = buildBalancedDirectionsForPool('orthogonal', 5, (items) => [ ...items ]);

        expect(directions).toHaveLength(5);
        expect(new Set(directions).size).toBeGreaterThan(1);
    });
});
