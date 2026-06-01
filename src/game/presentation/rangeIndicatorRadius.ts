import { getEnemyDefinitionOrThrow } from '../config/enemyCatalog';
import { bodyHalfExtent } from '../config/entityBodies';
import { GRID_CONFIG } from '../config/gridConfig';
import { TOWER_DEFINITIONS } from '../config/towerCatalog';
import { rangeIndicatorRadiusPx } from '../combat/combatRange';
import type { Grid } from '../grid/Grid';

const defaultTowerSizeScale = TOWER_DEFINITIONS[0]?.profile.sizeScale ?? 0.75;
const TOWER_BODY_HALF = bodyHalfExtent(GRID_CONFIG, defaultTowerSizeScale);
const ENEMY_BODY_HALF = bodyHalfExtent(
    GRID_CONFIG,
    getEnemyDefinitionOrThrow('basic').visual.sizeScale,
);

export const towerAttackIndicatorRadiusPx = (grid: Grid, rangeInTiles: number): number =>
    rangeIndicatorRadiusPx(
        grid.rangeToPixels(rangeInTiles),
        TOWER_BODY_HALF,
        TOWER_BODY_HALF,
        ENEMY_BODY_HALF,
        ENEMY_BODY_HALF,
    );

export const enemyAttackIndicatorRadiusPx = (grid: Grid, rangeInTiles: number): number =>
    rangeIndicatorRadiusPx(
        grid.rangeToPixels(rangeInTiles),
        ENEMY_BODY_HALF,
        ENEMY_BODY_HALF,
        TOWER_BODY_HALF,
        TOWER_BODY_HALF,
    );
