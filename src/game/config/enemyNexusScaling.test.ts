import { describe, expect, it } from 'vitest';
import { getNexusDamageForWave } from './nexusCombatScaling';
import { getEnemyNexusDamageForWave } from './enemyNexusScaling';

describe('getEnemyNexusDamageForWave', () =>
{
    it('hits much harder than the player nexus on every wave', () =>
    {
        for (const wave of [ 1, 3, 5, 8, 10 ])
        {
            expect(getEnemyNexusDamageForWave(wave)).toBeGreaterThan(getNexusDamageForWave(wave) * 2);
        }
    });

    it('starts strong on early waves', () =>
    {
        expect(getEnemyNexusDamageForWave(1)).toBe(50);
        expect(getEnemyNexusDamageForWave(2)).toBe(64);
        expect(getEnemyNexusDamageForWave(3)).toBe(78);
    });

    it('ramps faster after wave 6', () =>
    {
        expect(getEnemyNexusDamageForWave(6)).toBe(120);
        expect(getEnemyNexusDamageForWave(7)).toBe(142);
        expect(getEnemyNexusDamageForWave(10)).toBe(208);
    });

    it('clamps to wave 1 when wave is 0', () =>
    {
        expect(getEnemyNexusDamageForWave(0)).toBe(50);
    });
});
