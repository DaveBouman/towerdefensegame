import type { GridConfig, GridPixelSize } from '../grid/types';

/** Full playable field (10 tiles wide × 40 tiles tall). */
export const GRID_CONFIG: GridConfig = {
    cols: 10,
    rows: 40,
    tileSize: 64,
};

/** Visible portion of the field in the Phaser canvas (pan to see the rest). */
export const VIEWPORT_CONFIG: GridConfig = {
    cols: 10,
    rows: 10,
    tileSize: GRID_CONFIG.tileSize,
};

export const getGridPixelSize = (config: GridConfig = GRID_CONFIG): GridPixelSize => ({
    width: config.cols * config.tileSize,
    height: config.rows * config.tileSize,
});

export const getViewportPixelSize = (config: GridConfig = VIEWPORT_CONFIG): GridPixelSize =>
    getGridPixelSize(config);
