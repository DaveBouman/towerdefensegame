import { describe, expect, it } from 'vitest';
import { GRID_CONFIG } from './gridConfig';
import { WORLD_LAYOUT, WorldLayout } from './worldLayout';
import { Grid } from '../grid/Grid';
import { tileCenterWorld } from '../grid/worldPosition';

describe('WorldLayout', () =>
{
    const layout = WORLD_LAYOUT;
    const tile = { col: 1, row: 2 };

    it('arena matches the playfield when nexus bands are disabled', () =>
    {
        const arena = layout.arenaPixelSize();
        const playfield = layout.playfieldPixelSize();

        expect(arena).toEqual(playfield);
        expect(layout.playfieldOffsetY).toBe(0);
    });

    it('grid row 0 starts at world y = 0', () =>
    {
        expect(layout.gridTileTopLeft({ col: 0, row: 0 }).y).toBe(0);
    });

    it('worldToGrid maps tile centers back to grid coordinates', () =>
    {
        expect(layout.worldToGrid(layout.gridTileCenter(tile))).toEqual(tile);
    });

    it('Grid delegates conversions to the same layout instance', () =>
    {
        const grid = new Grid(GRID_CONFIG);

        expect(grid.layout).toBe(WORLD_LAYOUT);
        expect(grid.toTileCenter(tile)).toEqual(layout.gridTileCenter(tile));
        expect(grid.toTileCenter(tile)).toEqual(tileCenterWorld(GRID_CONFIG, tile));
    });

    it('custom configs get an isolated layout', () =>
    {
        const small = new WorldLayout({ cols: 4, rows: 4, tileSize: 32 }, 1);

        expect(small.playfieldOffsetY).toBe(32);
        expect(small.arenaPixelSize().height).toBe(4 * 32 + 32 * 2);
    });
});
