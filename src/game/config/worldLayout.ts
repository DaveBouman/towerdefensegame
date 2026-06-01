import { GRID_CONFIG, getGridPixelSize } from './gridConfig';
import type { GridPixelSize, GridPosition, WorldPosition } from '../grid/types';

/** Tile rows reserved above / below the playable grid for nexuses. */
export const NEXUS_ZONE_TILE_ROWS = 2;

const { tileSize, cols, rows } = GRID_CONFIG;

export const GRID_WORLD_OFFSET_Y = NEXUS_ZONE_TILE_ROWS * tileSize;

export const NEXUS_ZONE_HEIGHT_PX = NEXUS_ZONE_TILE_ROWS * tileSize;

export const getWorldPixelSize = (): GridPixelSize => ({
    width: cols * tileSize,
    height: rows * tileSize + NEXUS_ZONE_HEIGHT_PX * 2,
});

export const getGridCenterWorldX = (): number =>
    (cols * tileSize) / 2;

export const getEnemyNexusWorldPosition = (): WorldPosition => ({
    x: getGridCenterWorldX(),
    y: NEXUS_ZONE_HEIGHT_PX / 2,
});

export const getPlayerNexusWorldPosition = (): WorldPosition => ({
    x: getGridCenterWorldX(),
    y: GRID_WORLD_OFFSET_Y + rows * tileSize + NEXUS_ZONE_HEIGHT_PX / 2,
});

/** Nearest grid tile for units marching toward the player nexus. */
export const getPlayerNexusApproachTile = (): GridPosition => ({
    col: Math.floor((cols - 1) / 2),
    row: rows - 1,
});

export const isWorldPositionOnGrid = ({ x, y }: WorldPosition): boolean =>
{
    if (x < 0 || x >= cols * tileSize)
    {
        return false;
    }

    const localY = y - GRID_WORLD_OFFSET_Y;

    return localY >= 0 && localY < rows * tileSize;
};

/** Grid size only (legacy helpers). */
export const getPlayfieldPixelSize = (): GridPixelSize =>
    getGridPixelSize(GRID_CONFIG);
