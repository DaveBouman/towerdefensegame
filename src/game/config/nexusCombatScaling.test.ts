import { describe, expect, it } from 'vitest';
import { getNexusDamageForWave } from './nexusCombatScaling';
import { getEnemyNexusDamageForWave } from './enemyNexusScaling';

describe('getNexusDamageForWave', () =>
{
    it('matches the legacy enemy nexus export', () =>
    {
        expect(getNexusDamageForWave(3)).toBe(getEnemyNexusDamageForWave(3));
    });
});
