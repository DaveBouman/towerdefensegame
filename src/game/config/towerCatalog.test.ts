import { describe, expect, it } from 'vitest';
import { getTowerDefinition, TOWER_DEFINITIONS } from './towerCatalog';

describe('towerCatalog', () =>
{
    it('loads towers from towers.json', () =>
    {
        expect(TOWER_DEFINITIONS).toHaveLength(10);
        expect(getTowerDefinition('militia')?.tier).toBe(1);
        expect(getTowerDefinition('champion')?.tier).toBe(5);
        expect(getTowerDefinition('militia')?.profile.skills).toEqual([]);
        expect(getTowerDefinition('militia')?.profile.kamikazeExplosionRadiusTiles).toBe(0);
    });
});
