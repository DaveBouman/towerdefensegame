import { describe, expect, it } from 'vitest';
import { getTowerDefinition, TOWER_DEFINITIONS } from './towerCatalog';

describe('towerCatalog', () =>
{
    it('loads the militia tower from towers.json', () =>
    {
        expect(TOWER_DEFINITIONS).toHaveLength(1);
        expect(getTowerDefinition('militia')?.tier).toBe(1);
        expect(getTowerDefinition('militia')?.profile.isMobile).toBe(false);
    });
});
