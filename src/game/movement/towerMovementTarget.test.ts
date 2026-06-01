import { describe, expect, it } from 'vitest';
import { GRID_CONFIG } from '../config/gridConfig';
import { getEnemyDefinitionOrThrow } from '../config/enemyCatalog';
import { getTowerDefinitionOrThrow } from '../config/towerCatalog';
import { EnemyState } from '../domain/EnemyState';
import { bodyHalfExtent } from '../config/entityBodies';
import { Grid } from '../grid/Grid';
import { tileCenterWorld } from '../grid/worldPosition';
import { TowerState } from '../domain/TowerState';
import { pickTowerMovementTarget } from './towerMovementTarget';

describe('pickTowerMovementTarget', () =>
{
    const grid = new Grid(GRID_CONFIG);
    const enemyDef = getEnemyDefinitionOrThrow('basic');
    const towerDef = getTowerDefinitionOrThrow('bruiser');
    const enemyHalf = bodyHalfExtent(GRID_CONFIG, enemyDef.visual.sizeScale);
    const rangePx = grid.rangeToPixels(towerDef.profile.range);

    const towerAt = (row: number) =>
        new TowerState(grid, { col: 5, row }, towerDef.id, towerDef.profile);

    const enemyAt = (row: number) =>
        new EnemyState(
            tileCenterWorld(GRID_CONFIG, { col: 5, row }),
            enemyDef.id,
            enemyDef.unitType,
            enemyDef.baseStats,
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
