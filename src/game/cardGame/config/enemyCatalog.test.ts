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
            maxHealth: 80,
            attackDamage: 10,
            shieldGain: 10,
            hazardsPerTurn: 1,
        });
    });

    it('normalizes passive configs from json', () =>
    {
        expect(getCardGameEnemyDefinition('thornward')?.passives[0]).toEqual({
            id: 'thorns',
            reflectDamage: 3,
        });
        expect(getCardGameEnemyDefinition('smokebinder')?.passives.map((passive) => passive.id))
            .toEqual([ 'smoke', 'loopHunter', 'dampenTiles' ]);
    });

    it('uses the default enemy from game rules', () =>
    {
        expect(getDefaultCardGameEnemy().id).toBe('basic');
    });
});
