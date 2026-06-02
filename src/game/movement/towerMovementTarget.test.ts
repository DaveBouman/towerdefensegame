import { describe, expect, it } from 'vitest';
import { GRID_CONFIG } from '../config/gridConfig';
import { getEnemyDefinitionOrThrow } from '../config/enemyCatalog';
import { getTowerDefinitionOrThrow } from '../config/towerCatalog';
import { EnemyState } from '../domain/EnemyState';
import { bodyHalfExtent } from '../config/entityBodies';
import { Grid } from '../grid/Grid';
import { tileCenterWorld } from '../grid/worldPosition';
import { TowerState } from '../domain/TowerState';
import { ENEMY_NEXUS_ID, getEnemyNexusWorldPosition } from '../config/nexusConfig';
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

    const enemyAt = (row: number, damage = enemyDef.baseStats.damage) =>
        new EnemyState(
            tileCenterWorld(GRID_CONFIG, { col: 5, row }),
            enemyDef.id,
            enemyDef.unitType,
            { ...enemyDef.baseStats, damage },
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

    it('returns null when the preferred target is in attack range', () =>
    {
        const tower = towerAt(35);
        const inRange = enemyAt(34);

        expect(pickTowerMovementTarget(tower, [ inRange ], rangePx)).toBeNull();
    });

    it('advances on the priority target when only a non-preferred enemy is in range', () =>
    {
        const tower = towerAt(35);

        tower.setTargetingMode('highestDamage');

        const weakInRange = enemyAt(34, 5);
        const strongFar = enemyAt(5, 50);

        expect(
            pickTowerMovementTarget(tower, [ weakInRange, strongFar ], rangePx)?.id,
        ).toBe(strongFar.id);
    });

    it('targets the enemy nexus when it is the only attackable enemy', () =>
    {
        const tower = towerAt(35);
        const nexusDef = getEnemyDefinitionOrThrow('enemy-nexus');
        const nexusHalf = bodyHalfExtent(GRID_CONFIG, nexusDef.visual.sizeScale);
        const nexus = new EnemyState(
            getEnemyNexusWorldPosition(),
            nexusDef.id,
            nexusDef.unitType,
            nexusDef.baseStats,
            nexusHalf,
            nexusHalf,
            nexusDef.perks,
            nexusDef.skills,
            nexusDef.kamikazeExplosionRadiusTiles,
            false,
            true,
            ENEMY_NEXUS_ID,
        );

        expect(pickTowerMovementTarget(tower, [ nexus ], rangePx)?.id).toBe(ENEMY_NEXUS_ID);
    });
});
