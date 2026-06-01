import { describe, expect, it } from 'vitest';
import { getEnemyNexusDamageForWave } from './enemyNexusScaling';

describe('getEnemyNexusDamageForWave', () =>
{
    it('starts moderate on early waves', () =>
    {
        expect(getEnemyNexusDamageForWave(1)).toBe(18);
        expect(getEnemyNexusDamageForWave(2)).toBe(23);
        expect(getEnemyNexusDamageForWave(3)).toBe(28);
    });

    it('ramps faster after wave 5', () =>
    {
        expect(getEnemyNexusDamageForWave(5)).toBe(38);
        expect(getEnemyNexusDamageForWave(6)).toBe(42);
        expect(getEnemyNexusDamageForWave(10)).toBe(58);
        expect(getEnemyNexusDamageForWave(15)).toBe(78);
    });

    it('clamps to wave 1 when wave is 0', () =>
    {
        expect(getEnemyNexusDamageForWave(0)).toBe(18);
    });
});
