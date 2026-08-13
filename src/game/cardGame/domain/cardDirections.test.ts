import { describe, expect, it } from 'vitest';
import { buildBalancedDirectionsForPool, buildForwardBiasedDirectionsForPool, ORTHOGONAL_DIRECTIONS } from './cardDirections';

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

describe('buildForwardBiasedDirectionsForPool', () =>
{
    it('assigns more right arrows than left for orthogonal pools', () =>
    {
        const directions = buildForwardBiasedDirectionsForPool('orthogonal', 18, (items) => [ ...items ]);

        expect(directions.filter((arrow) => arrow === 'right')).toHaveLength(8);
        expect(directions.filter((arrow) => arrow === 'up')).toHaveLength(4);
        expect(directions.filter((arrow) => arrow === 'down')).toHaveLength(4);
        expect(directions.filter((arrow) => arrow === 'left')).toHaveLength(2);
    });

    it('assigns more rightward diagonals than leftward', () =>
    {
        const directions = buildForwardBiasedDirectionsForPool('diagonal', 6, (items) => [ ...items ]);

        expect(directions.filter((arrow) => arrow === 'up-right')).toHaveLength(2);
        expect(directions.filter((arrow) => arrow === 'down-right')).toHaveLength(2);
        expect(directions.filter((arrow) => arrow === 'up-left')).toHaveLength(1);
        expect(directions.filter((arrow) => arrow === 'down-left')).toHaveLength(1);
    });
});
