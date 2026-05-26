import { describe, expect, it } from 'vitest';
import { GRID_CONFIG } from '../config/gridConfig';
import { Grid } from '../grid/Grid';
import { tileKey } from './tileKey';
import { findPath } from './aStar';

describe('findPath', () =>
{
    const grid = new Grid(GRID_CONFIG);

    it('finds a route around a blocked tile', () =>
    {
        const blocked = new Set([ tileKey({ col: 2, row: 2 }) ]);
        const path = findPath(
            grid,
            { col: 4, row: 4 },
            { col: 0, row: 0 },
            blocked,
        );

        expect(path).not.toBeNull();
        expect(path!.some((tile) => tile.col === 2 && tile.row === 2)).toBe(false);
    });

    it('returns empty path when start equals goal', () =>
    {
        const path = findPath(
            grid,
            { col: 1, row: 1 },
            { col: 1, row: 1 },
            new Set(),
        );

        expect(path).toEqual([]);
    });
});
