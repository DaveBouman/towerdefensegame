import { describe, expect, it } from 'vitest';
import { GRID_CONFIG } from '../config/gridConfig';
import { getEnemyDefinitionOrThrow } from '../config/enemyCatalog';
import { bodyHalfExtent } from '../config/entityBodies';
import { EnemyState } from '../domain/EnemyState';
import { getEnemyNexusWorldPosition } from '../config/nexusConfig';
import {
    isEnemyNexusDefeated,
    isSkirmishOngoing,
    isWaveAssaultComplete,
    isWaveRoundComplete,
} from './roundOutcome';

describe('roundOutcome', () =>
{
    const basicDef = getEnemyDefinitionOrThrow('basic');
    const half = bodyHalfExtent(GRID_CONFIG, basicDef.visual.sizeScale);

    const minion = () =>
        new EnemyState(
            { x: 200, y: 200 },
            basicDef.id,
            basicDef.unitType,
            basicDef.baseStats,
            half,
            half,
        );

    it('skirmish continues while minions or spawns remain', () =>
    {
        expect(isSkirmishOngoing([ minion() ], false)).toBe(true);
        expect(isSkirmishOngoing([], true)).toBe(true);
        expect(isSkirmishOngoing([], false)).toBe(false);
        expect(isWaveAssaultComplete([], false)).toBe(true);
        expect(isWaveRoundComplete([], [], false)).toBe(true);
    });

    it('enemy nexus defeat is tracked at 0 HP', () =>
    {
        const nexusDef = getEnemyDefinitionOrThrow('enemy-nexus');
        const nexusHalf = bodyHalfExtent(GRID_CONFIG, nexusDef.visual.sizeScale);
        const nexus = new EnemyState(
            getEnemyNexusWorldPosition(),
            nexusDef.id,
            nexusDef.unitType,
            nexusDef.baseStats,
            nexusHalf,
            nexusHalf,
            [],
            false,
            true,
            'enemy-nexus',
        );

        expect(isEnemyNexusDefeated(nexus)).toBe(false);
        nexus.health = 0;
        expect(isEnemyNexusDefeated(nexus)).toBe(true);
    });
});
