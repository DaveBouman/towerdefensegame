import { GRID_CONFIG } from './gridConfig';
import type { GridPosition } from '../grid/types';

/** Number of rows at the bottom of the field where the player may deploy towers. */
export const PLAYER_PLACEMENT_ROW_COUNT = 10;

export const PLAYER_PLACEMENT_MIN_ROW = GRID_CONFIG.rows - PLAYER_PLACEMENT_ROW_COUNT;

export const isPlayerPlacementTile = ({ col, row }: GridPosition): boolean =>
    col >= 0
    && col < GRID_CONFIG.cols
    && row >= PLAYER_PLACEMENT_MIN_ROW
    && row < GRID_CONFIG.rows;
