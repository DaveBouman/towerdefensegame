import { describe, expect, it } from 'vitest';
import { GRID_CONFIG } from '../config/gridConfig';
import { BASIC_ENEMY_BASE_STATS } from '../config/basicEnemyStats';
import { bodyHalfExtent } from '../config/entityBodies';
import { BASIC_ENEMY_CONFIG } from '../config/enemyConfig';
import { CLOSE_RANGE_TOWER_PROFILE } from '../config/towerProfiles';
import { EnemyState } from '../domain/EnemyState';
import { TowerState } from '../domain/TowerState';
import { Grid } from '../grid/Grid';
import { tileCenterWorld } from '../grid/worldPosition';
import { pickTowerMovementTarget } from './towerMovementTarget';

describe('pickTowerMovementTarget', () =>
{
    const grid = new Grid(GRID_CONFIG);
    const rangePx = grid.rangeToPixels(CLOSE_RANGE_TOWER_PROFILE.range);
    const enemyHalf = bodyHalfExtent(GRID_CONFIG, BASIC_ENEMY_CONFIG.sizeScale);

    const towerAt = (row: number) =>
        new TowerState(grid, { col: 5, row }, CLOSE_RANGE_TOWER_PROFILE);

    const enemyAt = (row: number) =>
        new EnemyState(
            tileCenterWorld(GRID_CONFIG, { col: 5, row }),
            'Enemy',
            BASIC_ENEMY_BASE_STATS,
            enemyHalf,
            enemyHalf,
        );

    it('picks the nearest enemy when none are in attack range', () =>
    {
        const tower = towerAt(35);
        const far = enemyAt(5);
        const near = enemyAt(30);

        expect(pickTowerMovementTarget(tower, [ far, near ], rangePx)?.id).toBe(near.id);
    });

    it('returns null when an enemy is already in attack range', () =>
    {
        const tower = towerAt(35);
        const inRange = enemyAt(34);

        expect(pickTowerMovementTarget(tower, [ inRange ], rangePx)).toBeNull();
    });
});
