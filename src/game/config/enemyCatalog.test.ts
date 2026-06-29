import { describe, expect, it } from 'vitest';
import { ENEMY_DEFINITIONS, getEnemyDefinition } from './enemyCatalog';

describe('enemyCatalog', () =>
{
    it('loads the basic enemy from enemies.json', () =>
    {
        expect(ENEMY_DEFINITIONS).toHaveLength(1);
        expect(getEnemyDefinition('basic')?.unitType).toBe('Basic Enemy');
    });

    it('throws for unknown enemy ids', () =>
    {
        expect(getEnemyDefinition('missing')).toBeUndefined();
    });
});
