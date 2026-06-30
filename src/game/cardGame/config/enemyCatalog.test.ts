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
            attackDamage: 8,
            shieldGain: 10,
            hazardsPerTurn: 1,
        });
    });

    it('uses the default enemy from game rules', () =>
    {
        expect(getDefaultCardGameEnemy().id).toBe('basic');
    });
});
