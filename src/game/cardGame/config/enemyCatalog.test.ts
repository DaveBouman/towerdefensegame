import { describe, expect, it } from 'vitest';
import {
    CARD_GAME_ENEMY_DEFINITIONS,
    getCardGameEnemyDefinition,
    getDefaultCardGameEnemy,
} from './enemyCatalog';

describe('enemyCatalog', () =>
{
    it('loads card-game enemy definitions from enemies.json', () =>
    {
        expect(CARD_GAME_ENEMY_DEFINITIONS.length).toBeGreaterThanOrEqual(1);
        expect(getCardGameEnemyDefinition('basic')).toMatchObject({
            label: 'Raider',
            maxHealth: 190,
            attackDamage: 13,
            shieldGain: 13,
            hazardsPerTurn: 1,
        });
    });

    it('normalizes passive configs from json', () =>
    {
        expect(getCardGameEnemyDefinition('thornward')?.passives[0]).toEqual({
            id: 'thorns',
            reflectDamage: 4,
        });
        expect(getCardGameEnemyDefinition('smokebinder')?.passives.map((passive) => passive.id))
            .toEqual([ 'smoke', 'loopHunter', 'dampenTiles' ]);
    });

    it('uses the default enemy from game rules', () =>
    {
        expect(getDefaultCardGameEnemy().id).toBe('basic');
    });
});
