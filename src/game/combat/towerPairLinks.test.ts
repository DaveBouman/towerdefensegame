import { describe, expect, it } from 'vitest';
import { GRID_CONFIG } from '../config/gridConfig';
import { createTowerState } from '../domain/createTowerState';
import { computeActiveTowerPairLinks, isTowerPairLinked } from './towerPairLinks';
import { Grid } from '../grid/Grid';

describe('towerPairLinks', () =>
{
    const grid = new Grid(GRID_CONFIG);

    it('links adjacent militia placed on spawn tiles', () =>
    {
        const a = createTowerState(grid, { col: 0, row: 0 }, 'militia');
        const b = createTowerState(grid, { col: 1, row: 0 }, 'militia');

        expect(isTowerPairLinked(a, b, grid)).toBe(true);
        expect(computeActiveTowerPairLinks([ a, b ], grid)).toHaveLength(1);
    });

    it('links militia placed vertically adjacent', () =>
    {
        const a = createTowerState(grid, { col: 0, row: 0 }, 'militia');
        const b = createTowerState(grid, { col: 0, row: 1 }, 'militia');

        expect(isTowerPairLinked(a, b, grid)).toBe(true);
    });

    it('does not link militia that are too far apart', () =>
    {
        const a = createTowerState(grid, { col: 0, row: 0 }, 'militia');
        const b = createTowerState(grid, { col: 2, row: 0 }, 'militia');

        expect(isTowerPairLinked(a, b, grid)).toBe(false);
        expect(computeActiveTowerPairLinks([ a, b ], grid)).toHaveLength(0);
    });
});
