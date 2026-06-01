import { describe, expect, it } from 'vitest';
import { ENEMY_DEFINITIONS, getEnemyDefinition } from './enemyCatalog';

describe('enemyCatalog', () =>
{
    it('loads enemies from enemies.json', () =>
    {
        expect(ENEMY_DEFINITIONS.length).toBeGreaterThan(0);
        expect(getEnemyDefinition('basic')?.unitType).toBe('Basic Enemy');
    });

    it('throws for unknown enemy ids', () =>
    {
        expect(getEnemyDefinition('missing')).toBeUndefined();
    });
});
