import { describe, expect, it } from 'vitest';
import { GRID_CONFIG } from '../config/gridConfig';
import { getEnemyDefinitionOrThrow } from '../config/enemyCatalog';
import { bodyHalfExtent } from '../config/entityBodies';
import { EnemyState } from '../domain/EnemyState';
import { TowerState } from '../domain/TowerState';
import { getTowerDefinitionOrThrow } from '../config/towerCatalog';
import { Grid } from '../grid/Grid';
import { tileCenterWorld } from '../grid/worldPosition';
import {
    canEnemiesTargetPlayerNexus,
    enemiesAttackableByTowers,
    livingMinions,
} from './targetPriority';
import { ENEMY_NEXUS_ID, getEnemyNexusWorldPosition } from '../config/nexusConfig';

describe('targetPriority', () =>
{
    const grid = new Grid(GRID_CONFIG);
    const basicDef = getEnemyDefinitionOrThrow('basic');
    const nexusDef = getEnemyDefinitionOrThrow('enemy-nexus');
    const towerDef = getTowerDefinitionOrThrow('militia');
    const half = (scale: number) => bodyHalfExtent(GRID_CONFIG, scale);

    const minion = () =>
        new EnemyState(
            tileCenterWorld(GRID_CONFIG, { col: 2, row: 2 }),
            basicDef.id,
            basicDef.unitType,
            basicDef.baseStats,
            half(basicDef.visual.sizeScale),
            half(basicDef.visual.sizeScale),
        );

    const nexus = () =>
        new EnemyState(
            getEnemyNexusWorldPosition(),
            nexusDef.id,
            nexusDef.unitType,
            nexusDef.baseStats,
            half(nexusDef.visual.sizeScale),
            half(nexusDef.visual.sizeScale),
            [],
            false,
            true,
            ENEMY_NEXUS_ID,
        );

    const tower = () =>
        new TowerState(
            grid,
            { col: 4, row: 35 },
            towerDef.id,
            towerDef.profile,
        );

    it('excludes the enemy nexus from living minions', () =>
    {
        expect(livingMinions([ minion(), nexus() ])).toHaveLength(1);
    });

    it('defers enemy nexus targeting until minions are gone', () =>
    {
        expect(enemiesAttackableByTowers([ minion(), nexus() ])).toHaveLength(1);
        expect(enemiesAttackableByTowers([ nexus() ])).toHaveLength(1);
        expect(enemiesAttackableByTowers([ nexus() ])[0].isNexus).toBe(true);
    });

    it('blocks player nexus targeting while towers remain', () =>
    {
        expect(canEnemiesTargetPlayerNexus([ tower() ])).toBe(false);
        expect(canEnemiesTargetPlayerNexus([])).toBe(true);
    });
});
