import { describe, expect, it } from 'vitest';
import { expandRolledEnemy } from './battleEncounterRoll';

describe('battleEncounterRoll', () =>
{
    it('expands duo primaries into full lineups', () =>
    {
        expect(expandRolledEnemy('broodframe')).toEqual({
            enemyId: 'broodframe',
            enemyIds: [ 'broodframe', 'wire-drone' ],
        });
        expect(expandRolledEnemy('twin-clip')).toEqual({
            enemyId: 'twin-clip',
            enemyIds: [ 'twin-clip', 'twin-clip' ],
        });
        expect(expandRolledEnemy('bulwark-runner')).toEqual({
            enemyId: 'bulwark-runner',
            enemyIds: [ 'bulwark-runner', 'glass-striker' ],
        });
        expect(expandRolledEnemy('chrome-saint')).toEqual({
            enemyId: 'chrome-saint',
            enemyIds: [ 'chrome-saint', 'glass-striker' ],
        });
        expect(expandRolledEnemy('basic')).toEqual({ enemyId: 'basic' });
    });
});
