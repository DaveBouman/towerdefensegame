import { describe, expect, it } from 'vitest';
import { GRID_CONFIG } from '../config/gridConfig';
import { WORLD_LAYOUT } from '../config/worldLayout';
import { Grid } from './Grid';
import { tileCenterWorld } from './worldPosition';

describe('Grid world offset', () =>
{
    const grid = new Grid(GRID_CONFIG);
    const tile = { col: 4, row: 35 };

    it('toTileCenter matches tileCenterWorld via WorldLayout', () =>
    {
        expect(grid.toTileCenter(tile)).toEqual(tileCenterWorld(GRID_CONFIG, tile));
        expect(grid.toTileCenter(tile)).toEqual(WORLD_LAYOUT.gridTileCenter(tile));
    });

    it('toWorld places tile top-left below the nexus zone', () =>
    {
        const world = grid.toWorld(tile);

        expect(world.y).toBe(
            WORLD_LAYOUT.playfieldOffsetY + tile.row * GRID_CONFIG.tileSize,
        );
    });
});
