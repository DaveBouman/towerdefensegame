import { GRID_CONFIG } from './gridConfig';
import type { GridPosition } from '../grid/types';

/** Top-center tile for the enemy nexus (10-column grid). */
export const ENEMY_NEXUS_TILE: GridPosition = {
    col: Math.floor((GRID_CONFIG.cols - 1) / 2),
    row: 0,
};

/** Bottom-center tile for the player nexus. */
export const PLAYER_NEXUS_TILE: GridPosition = {
    col: Math.floor((GRID_CONFIG.cols - 1) / 2),
    row: GRID_CONFIG.rows - 1,
};

export const ENEMY_NEXUS_KIND = 'enemy-nexus';
export const ENEMY_NEXUS_ID = 'enemy-nexus';

export const isPlayerNexusTile = (tile: GridPosition): boolean =>
    tile.col === PLAYER_NEXUS_TILE.col && tile.row === PLAYER_NEXUS_TILE.row;

export const isEnemyNexusTile = (tile: GridPosition): boolean =>
    tile.col === ENEMY_NEXUS_TILE.col && tile.row === ENEMY_NEXUS_TILE.row;
