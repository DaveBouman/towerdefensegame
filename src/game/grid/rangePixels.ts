import type { Grid } from './Grid';

export const rangeTilesToPixels = (grid: Grid, rangeInTiles: number): number =>
    rangeInTiles * grid.config.tileSize;
