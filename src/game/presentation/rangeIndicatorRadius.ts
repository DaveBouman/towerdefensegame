import { BASIC_ENEMY_CONFIG } from '../config/enemyConfig';
import { bodyHalfExtent } from '../config/entityBodies';
import { GRID_CONFIG } from '../config/gridConfig';
import { CLOSE_RANGE_TOWER_PROFILE } from '../config/towerProfiles';
import { rangeIndicatorRadiusPx } from '../combat/combatRange';
import type { Grid } from '../grid/Grid';

const TOWER_BODY_HALF = bodyHalfExtent(GRID_CONFIG, CLOSE_RANGE_TOWER_PROFILE.sizeScale);
const ENEMY_BODY_HALF = bodyHalfExtent(GRID_CONFIG, BASIC_ENEMY_CONFIG.sizeScale);

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
