import { describe, expect, it } from 'vitest';
import { GRID_CONFIG } from '../config/gridConfig';
import { getEnemyDefinitionOrThrow } from '../config/enemyCatalog';
import { bodyHalfExtent } from '../config/entityBodies';
import { EnemyState } from '../domain/EnemyState';
import { isWaveRoundComplete } from './roundOutcome';

describe('roundOutcome', () =>
{
    const basicDef = getEnemyDefinitionOrThrow('basic');
    const half = bodyHalfExtent(GRID_CONFIG, basicDef.visual.sizeScale);

    const minion = () =>
        new EnemyState(
            { x: 64, y: 64 },
            basicDef.id,
            basicDef.unitType,
            basicDef.baseStats,
            half,
            half,
        );

    it('wave ends when all minions are gone and no spawns remain', () =>
    {
        expect(isWaveRoundComplete([ minion() ], false)).toBe(false);
        expect(isWaveRoundComplete([], true)).toBe(false);
        expect(isWaveRoundComplete([], false)).toBe(true);
    });
});
