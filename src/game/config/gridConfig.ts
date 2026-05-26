import type { GridConfig, GridPixelSize } from '../grid/types';

export const GRID_CONFIG: GridConfig = {
    cols: 10,
    rows: 10,
    tileSize: 64,
};

export const getGridPixelSize = (config: GridConfig = GRID_CONFIG): GridPixelSize => ({
    width: config.cols * config.tileSize,
    height: config.rows * config.tileSize,
});
