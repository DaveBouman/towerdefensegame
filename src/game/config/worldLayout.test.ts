import { describe, expect, it } from 'vitest';
import { GRID_CONFIG } from './gridConfig';
import { WORLD_LAYOUT, WorldLayout } from './worldLayout';
import { Grid } from '../grid/Grid';
import { tileCenterWorld } from '../grid/worldPosition';

describe('WorldLayout', () =>
{
    const layout = WORLD_LAYOUT;
    const tile = { col: 4, row: 35 };

    it('arena height includes both nexus bands and the playfield', () =>
    {
        const arena = layout.arenaPixelSize();
        const playfield = layout.playfieldPixelSize();

        expect(arena.width).toBe(playfield.width);
        expect(arena.height).toBe(playfield.height + layout.nexusZoneHeightPx * 2);
    });

    it('grid row 0 starts below the enemy nexus zone', () =>
    {
        const topLeft = layout.gridTileTopLeft({ col: 0, row: 0 });

        expect(topLeft.y).toBe(layout.playfieldOffsetY);
    });

    it('approach tiles sit on the nearest playfield row to each nexus', () =>
    {
        expect(layout.enemyNexusApproachTile()).toEqual({ col: 4, row: 0 });
        expect(layout.playerNexusApproachTile()).toEqual({
            col: 4,
            row: GRID_CONFIG.rows - 1,
        });
    });

    it('nexuses sit in the center of their bands', () =>
    {
        expect(layout.enemyNexusPosition().y).toBe(layout.nexusZoneHeightPx / 2);
        expect(layout.playerNexusPosition().y).toBe(
            layout.playfieldOffsetY
            + GRID_CONFIG.rows * GRID_CONFIG.tileSize
            + layout.nexusZoneHeightPx / 2,
        );
    });

    it('worldToGrid returns null outside the playfield', () =>
    {
        expect(layout.worldToGrid(layout.enemyNexusPosition())).toBeNull();
        expect(layout.worldToGrid(layout.playerNexusPosition())).toBeNull();
        expect(layout.worldToGrid(layout.gridTileCenter(tile))).toEqual(tile);
    });

    it('playfieldAnchorTile maps off-grid nexuses onto the nearest playfield row', () =>
    {
        expect(layout.playfieldAnchorTile(layout.enemyNexusPosition())).toEqual({ col: 5, row: 0 });
        expect(layout.playfieldAnchorTile(layout.playerNexusPosition())).toEqual({
            col: 5,
            row: GRID_CONFIG.rows - 1,
        });
    });

    it('zone helpers match nexus band geometry', () =>
    {
        const width = layout.arenaPixelSize().width;

        expect(layout.isInEnemyNexusZone(layout.enemyNexusPosition())).toBe(true);
        expect(layout.isInPlayerNexusZone(layout.playerNexusPosition())).toBe(true);
        expect(layout.isOnPlayfield(layout.gridTileCenter(tile))).toBe(true);
        expect(layout.enemyNexusZoneRect(width).centerY).toBe(layout.nexusZoneHeightPx / 2);
        expect(layout.playerNexusZoneRect(width).centerY).toBe(layout.playerNexusPosition().y);
    });

    it('Grid delegates conversions to the same layout instance', () =>
    {
        const grid = new Grid(GRID_CONFIG);

        expect(grid.layout).toBe(WORLD_LAYOUT);
        expect(grid.toTileCenter(tile)).toEqual(layout.gridTileCenter(tile));
        expect(grid.toTileCenter(tile)).toEqual(tileCenterWorld(GRID_CONFIG, tile));
        expect(grid.toWorld(tile).y).toBe(
            layout.playfieldOffsetY + tile.row * GRID_CONFIG.tileSize,
        );
    });

    it('custom configs get an isolated layout', () =>
    {
        const small = new WorldLayout({ cols: 4, rows: 4, tileSize: 32 }, 1);

        expect(small.playfieldOffsetY).toBe(32);
        expect(small.arenaPixelSize().height).toBe(4 * 32 + 32 * 2);
    });
});
