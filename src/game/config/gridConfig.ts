import type { GridConfig, GridPixelSize } from '../grid/types';

/** 4×4 card board — one card per cell. */
export const GRID_CONFIG: GridConfig = {
    cols: 4,
    rows: 4,
    tileSize: 96,
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
