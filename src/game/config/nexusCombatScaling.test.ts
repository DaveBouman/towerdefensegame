import { describe, expect, it } from 'vitest';
import { getEnemyNexusDamageForWave } from './enemyNexusScaling';
import { getNexusDamageForWave } from './nexusCombatScaling';

describe('getNexusDamageForWave', () =>
{
    it('scales player nexus damage separately from the enemy boss nexus', () =>
    {
        expect(getNexusDamageForWave(3)).toBe(28);
        expect(getEnemyNexusDamageForWave(3)).toBe(78);
    });
});
