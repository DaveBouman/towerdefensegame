import type { GridConfig, GridPixelSize } from '../grid/types';

/** 5×5 card board — one card per cell. */
export const GRID_CONFIG: GridConfig = {
    cols: 5,
    rows: 5,
    tileSize: 80,
};

export const VIEWPORT_CONFIG: GridConfig = { ...GRID_CONFIG };

export const getGridPixelSize = (config: GridConfig = GRID_CONFIG): GridPixelSize => ({
    width: config.cols * config.tileSize,
    height: config.rows * config.tileSize,
});

export const getViewportPixelSize = (_config: GridConfig = VIEWPORT_CONFIG): GridPixelSize =>
{
    if (typeof window === 'undefined')
    {
        return { width: 960, height: 540 };
    }

    return {
        width: window.innerWidth,
        height: window.innerHeight,
    };
};

/** Enemy traps may only be placed in this many rightmost columns. */
export const TRAP_PLACEMENT_COLUMN_COUNT = 3;

export const getTrapPlacementMinColumn = (cols = GRID_CONFIG.cols): number =>
    cols - TRAP_PLACEMENT_COLUMN_COUNT;

export const isTrapPlacementColumn = (col: number, cols = GRID_CONFIG.cols): boolean =>
    col >= getTrapPlacementMinColumn(cols);
