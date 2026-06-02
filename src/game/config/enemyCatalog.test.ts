import { describe, expect, it } from 'vitest';
import { ENEMY_DEFINITIONS, getEnemyDefinition } from './enemyCatalog';

describe('enemyCatalog', () =>
{
    it('loads enemies from enemies.json', () =>
    {
        expect(ENEMY_DEFINITIONS.length).toBeGreaterThan(0);
        expect(getEnemyDefinition('basic')?.unitType).toBe('Basic Enemy');
        expect(getEnemyDefinition('kamikaze')?.skills).toContain('kamikaze');
        expect(getEnemyDefinition('kamikaze')?.kamikazeExplosionRadiusTiles).toBe(3);
        expect(getEnemyDefinition('kamikaze')?.baseStats.armorByType.fire).toBe(25);
        expect(getEnemyDefinition('basic')?.baseStats.armorByType.earth).toBe(3);
    });

    it('throws for unknown enemy ids', () =>
    {
        expect(getEnemyDefinition('missing')).toBeUndefined();
    });
});
