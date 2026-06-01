import { describe, expect, it } from 'vitest';
import { GRID_CONFIG } from '../config/gridConfig';
import { EnemyState } from '../domain/EnemyState';
import { BASIC_ENEMY_BASE_STATS } from '../config/basicEnemyStats';
import { bodyHalfExtent } from '../config/entityBodies';
import { BASIC_ENEMY_CONFIG } from '../config/enemyConfig';
import { CLOSE_RANGE_TOWER_PROFILE } from '../config/towerProfiles';
import { Grid } from '../grid/Grid';
import { tileCenterWorld } from '../grid/worldPosition';
import { TowerState } from '../domain/TowerState';
import { pickTowerAttackTarget } from './towerTargeting';

describe('pickTowerAttackTarget', () =>
{
    const grid = new Grid(GRID_CONFIG);
    const half = bodyHalfExtent(GRID_CONFIG, BASIC_ENEMY_CONFIG.sizeScale);

    const tower = new TowerState(
        grid,
        { col: 5, row: 35 },
        'bruiser',
        CLOSE_RANGE_TOWER_PROFILE,
    );

    const enemyAt = (col: number, row: number, health: number, attackDamage: number) =>
    {
        const stats = { ...BASIC_ENEMY_BASE_STATS, attackDamage };
        const enemy = new EnemyState(
            tileCenterWorld(GRID_CONFIG, { col, row }),
            'Enemy',
            stats,
            half,
            half,
        );

        enemy.health = health;

        return enemy;
    };

  const rangePx = grid.rangeToPixels(tower.range);

    it('picks weakest among in-range enemies', () =>
    {
        const far = enemyAt(5, 33, 100, 5);
        const weak = enemyAt(5, 34, 20, 5);

        const target = pickTowerAttackTarget('weakest', tower, [ far, weak ], rangePx);

        expect(target?.id).toBe(weak.id);
    });

    it('ignores enemies outside range', () =>
    {
        const outOfRange = enemyAt(5, 10, 10, 5);

        const target = pickTowerAttackTarget('weakest', tower, [ outOfRange ], rangePx);

        expect(target).toBeNull();
    });
});
