import { GRID_CONFIG, getGridPixelSize } from './gridConfig';
import type { GridConfig, GridPixelSize, GridPosition, WorldPosition } from '../grid/types';

/** Tile rows reserved above / below the playable grid for nexuses. */
export const DEFAULT_NEXUS_ZONE_TILE_ROWS = 2;

export interface NexusZoneRect {
    centerX: number;
    centerY: number;
    width: number;
    height: number;
}

/**
 * Single source of truth for arena geometry: playfield offset, nexus bands,
 * and all grid ↔ world conversions.
 */
export class WorldLayout
{
    readonly config: GridConfig;
    readonly nexusZoneTileRows: number;
    /** Y offset where grid row 0 begins in world space. */
    readonly playfieldOffsetY: number;
    readonly nexusZoneHeightPx: number;

    constructor (
        config: GridConfig = GRID_CONFIG,
        nexusZoneTileRows: number = DEFAULT_NEXUS_ZONE_TILE_ROWS,
    )
    {
        this.config = config;
        this.nexusZoneTileRows = nexusZoneTileRows;
        this.nexusZoneHeightPx = nexusZoneTileRows * config.tileSize;
        this.playfieldOffsetY = this.nexusZoneHeightPx;
    }

    arenaPixelSize (): GridPixelSize
    {
        const { cols, rows, tileSize } = this.config;

        return {
            width: cols * tileSize,
            height: rows * tileSize + this.nexusZoneHeightPx * 2,
        };
    }

    playfieldPixelSize (): GridPixelSize
    {
        return getGridPixelSize(this.config);
    }

    playfieldCenterX (): number
    {
        return (this.config.cols * this.config.tileSize) / 2;
    }

    gridTileTopLeft ({ col, row }: GridPosition): WorldPosition
    {
        const { tileSize } = this.config;

        return {
            x: col * tileSize,
            y: this.playfieldOffsetY + row * tileSize,
        };
    }

    gridTileCenter ({ col, row }: GridPosition): WorldPosition
    {
        const { tileSize } = this.config;
        const half = tileSize / 2;

        return {
            x: col * tileSize + half,
            y: this.playfieldOffsetY + row * tileSize + half,
        };
    }

    worldToGrid ({ x, y }: WorldPosition): GridPosition | null
    {
        const localY = y - this.playfieldOffsetY;

        if (localY < 0)
        {
            return null;
        }

        const { cols, rows, tileSize } = this.config;
        const position = {
            col: Math.floor(x / tileSize),
            row: Math.floor(localY / tileSize),
        };

        if (
            position.col < 0
            || position.col >= cols
            || position.row < 0
            || position.row >= rows
        )
        {
            return null;
        }

        return position;
    }

    isOnPlayfield ({ x, y }: WorldPosition): boolean
    {
        const { cols, rows, tileSize } = this.config;

        if (x < 0 || x >= cols * tileSize)
        {
            return false;
        }

        const localY = y - this.playfieldOffsetY;

        return localY >= 0 && localY < rows * tileSize;
    }

    isInEnemyNexusZone ({ y }: WorldPosition): boolean
    {
        return y >= 0 && y < this.nexusZoneHeightPx;
    }

    isInPlayerNexusZone ({ y }: WorldPosition): boolean
    {
        const { rows, tileSize } = this.config;
        const playfieldBottom = this.playfieldOffsetY + rows * tileSize;

        return y >= playfieldBottom && y < playfieldBottom + this.nexusZoneHeightPx;
    }

    enemyNexusPosition (): WorldPosition
    {
        return {
            x: this.playfieldCenterX(),
            y: this.nexusZoneHeightPx / 2,
        };
    }

    playerNexusPosition (): WorldPosition
    {
        const { rows, tileSize } = this.config;

        return {
            x: this.playfieldCenterX(),
            y: this.playfieldOffsetY + rows * tileSize + this.nexusZoneHeightPx / 2,
        };
    }

    /** Nearest grid tile for units marching toward the player nexus. */
    playerNexusApproachTile (): GridPosition
    {
        const { cols, rows } = this.config;

        return {
            col: Math.floor((cols - 1) / 2),
            row: rows - 1,
        };
    }

    /** Nearest grid tile for units marching toward the enemy nexus. */
    enemyNexusApproachTile (): GridPosition
    {
        const { cols } = this.config;

        return {
            col: Math.floor((cols - 1) / 2),
            row: 0,
        };
    }

    enemyNexusZoneRect (arenaWidth: number): NexusZoneRect
    {
        return {
            centerX: arenaWidth / 2,
            centerY: this.nexusZoneHeightPx / 2,
            width: arenaWidth,
            height: this.nexusZoneHeightPx,
        };
    }

    playerNexusZoneRect (arenaWidth: number): NexusZoneRect
    {
        const { rows, tileSize } = this.config;
        const zoneTop = this.playfieldOffsetY + rows * tileSize;

        return {
            centerX: arenaWidth / 2,
            centerY: zoneTop + this.nexusZoneHeightPx / 2,
            width: arenaWidth,
            height: this.nexusZoneHeightPx,
        };
    }

    worldToTileLabel ({ x, y }: WorldPosition): string
    {
        const localY = y - this.playfieldOffsetY;
        const { rows, tileSize } = this.config;

        if (localY < 0)
        {
            return 'Enemy nexus';
        }

        if (localY >= rows * tileSize)
        {
            return 'Your nexus';
        }

        const col = Math.floor(x / tileSize);
        const row = Math.floor(localY / tileSize);

        return `${col}, ${row}`;
    }
}

export const WORLD_LAYOUT = new WorldLayout(GRID_CONFIG);

export const worldLayoutFor = (config: GridConfig): WorldLayout =>
    config === GRID_CONFIG ? WORLD_LAYOUT : new WorldLayout(config);
