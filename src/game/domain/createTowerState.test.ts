import { describe, expect, it } from 'vitest';
import { GRID_CONFIG } from '../config/gridConfig';
import { Grid } from '../grid/Grid';
import { createTowerState } from './createTowerState';

describe('createTowerState', () =>
{
    const grid = new Grid(GRID_CONFIG);
    const tile = { col: 4, row: 35 };

    it('tier 1 towers start with no catalog items', () =>
    {
        const tower = createTowerState(grid, tile, 'militia');

        expect(tower.equippedUpgrades).toEqual([]);
    });

    it('tier 2+ towers start with archetype catalog items', () =>
    {
        const tower = createTowerState(grid, tile, 'guard');

        expect(tower.equippedUpgrades.map((u) => u.id)).toEqual([
            'boots-of-speed',
            'hands-of-fire',
        ]);
    });
});
