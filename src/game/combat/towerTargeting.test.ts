import { describe, expect, it } from 'vitest';
import { GRID_CONFIG } from '../config/gridConfig';
import { getEnemyDefinitionOrThrow } from '../config/enemyCatalog';
import { getTowerDefinitionOrThrow } from '../config/towerCatalog';
import { EnemyState } from '../domain/EnemyState';
import { bodyHalfExtent } from '../config/entityBodies';
import { Grid } from '../grid/Grid';
import { tileCenterWorld } from '../grid/worldPosition';
import { TowerState } from '../domain/TowerState';
import { pickTowerAttackTarget } from './towerTargeting';

describe('pickTowerAttackTarget', () =>
{
    const grid = new Grid(GRID_CONFIG);
    const enemyDef = getEnemyDefinitionOrThrow('basic');
    const towerDef = getTowerDefinitionOrThrow('bruiser');
    const half = bodyHalfExtent(GRID_CONFIG, enemyDef.visual.sizeScale);

    const tower = new TowerState(
        grid,
        { col: 5, row: 35 },
        towerDef.id,
        towerDef.profile,
    );

    const enemyAt = (col: number, row: number, health: number, damage: number) =>
    {
        const stats = { ...enemyDef.baseStats, damage };
        const enemy = new EnemyState(
            tileCenterWorld(GRID_CONFIG, { col, row }),
            enemyDef.id,
            enemyDef.unitType,
            stats,
            half,
            half,
        );

        enemy.health = health;

        return enemy;
    };

    const rangePx = grid.rangeToPixels(tower.range);

    it('weakest picks lowest HP in range', () =>
    {
        const weak = enemyAt(5, 34, 20, 5);
        const far = enemyAt(5, 33, 80, 5);

        const target = pickTowerAttackTarget('weakest', tower, [ far, weak ], rangePx);

        expect(target?.id).toBe(weak.id);
    });

    it('ignores out of range enemies', () =>
    {
        const outOfRange = enemyAt(0, 0, 10, 5);

        const target = pickTowerAttackTarget('weakest', tower, [ outOfRange ], rangePx);

        expect(target).toBeNull();
    });
});
