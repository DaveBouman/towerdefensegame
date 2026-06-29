import type { GridConfig, GridPixelSize } from '../grid/types';

/** 3×3 card board — one card per cell. */
export const GRID_CONFIG: GridConfig = {
    cols: 3,
    rows: 3,
    tileSize: 96,
};

export const VIEWPORT_CONFIG: GridConfig = { ...GRID_CONFIG };

export const getGridPixelSize = (config: GridConfig = GRID_CONFIG): GridPixelSize => ({
    width: config.cols * config.tileSize,
    height: config.rows * config.tileSize,
});

export const getViewportPixelSize = (_config: GridConfig = VIEWPORT_CONFIG): GridPixelSize => ({
    width: 960,
    height: 540,
});
