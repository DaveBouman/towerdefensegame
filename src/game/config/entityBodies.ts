import type { GridConfig } from '../grid/types';

export const bodyHalfExtent = (config: GridConfig, sizeScale: number): number =>
    (config.tileSize * sizeScale) / 2;

export const bodySize = (config: GridConfig, sizeScale: number): number =>
    config.tileSize * sizeScale;
