import { WORLD_LAYOUT } from './worldLayout';
import type { GridPosition, WorldPosition } from '../grid/types';

export const ENEMY_NEXUS_KIND = 'enemy-nexus';
export const ENEMY_NEXUS_ID = 'enemy-nexus';

export const getEnemyNexusWorldPosition = (): WorldPosition =>
    WORLD_LAYOUT.enemyNexusPosition();

export const getPlayerNexusWorldPosition = (): WorldPosition =>
    WORLD_LAYOUT.playerNexusPosition();

export const getPlayerNexusApproachTile = (): GridPosition =>
    WORLD_LAYOUT.playerNexusApproachTile();

export const getEnemyNexusApproachTile = (): GridPosition =>
    WORLD_LAYOUT.enemyNexusApproachTile();
