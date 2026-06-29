import { describe, expect, it } from 'vitest';
import { GRID_CONFIG } from '../config/gridConfig';
import { WORLD_LAYOUT } from '../config/worldLayout';
import { Grid } from './Grid';
import { tileCenterWorld } from './worldPosition';

describe('Grid world offset', () =>
{
    const grid = new Grid(GRID_CONFIG);
    const tile = { col: 1, row: 2 };

    it('toTileCenter matches tileCenterWorld via WorldLayout', () =>
    {
        expect(grid.toTileCenter(tile)).toEqual(tileCenterWorld(GRID_CONFIG, tile));
        expect(grid.toTileCenter(tile)).toEqual(WORLD_LAYOUT.gridTileCenter(tile));
    });

    it('toWorld places tile top-left at row * tileSize when offset is zero', () =>
    {
        const world = grid.toWorld(tile);

        expect(world.y).toBe(tile.row * GRID_CONFIG.tileSize);
    });
});
