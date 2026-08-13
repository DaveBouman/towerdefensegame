import { describe, expect, it } from 'vitest';
import { GAME_RULES } from '../config/cardRegistry';
import { getDefaultCardGameEnemy } from '../config/enemyCatalog';
import { reseed } from '../../random/rng';
import {
    createEnemyCombatant,
    getEnemyHealthRange,
    rollEnemyMaxHealth,
} from './enemyCombatants';

describe('enemyCombatants health variance', () =>
{
    it('rolls fight HP within ±10% of the median', () =>
    {
        const median = 40;
        const { min, max } = getEnemyHealthRange(median);

        expect(min).toBe(36);
        expect(max).toBe(44);

        reseed(1);

        for (let attempt = 0; attempt < 40; attempt++)
        {
            const rolled = rollEnemyMaxHealth(median);

            expect(rolled).toBeGreaterThanOrEqual(min);
            expect(rolled).toBeLessThanOrEqual(max);
        }
    });

    it('is deterministic for the same seed', () =>
    {
        reseed(42);
        const first = rollEnemyMaxHealth(40);
        reseed(42);
        const second = rollEnemyMaxHealth(40);

        expect(first).toBe(second);
    });

    it('applies the roll when creating a combatant', () =>
    {
        const median = getDefaultCardGameEnemy().maxHealth;
        const { min, max } = getEnemyHealthRange(median);

        reseed(7);
        const combatant = createEnemyCombatant('enemy-0', GAME_RULES.defaultEnemyId);

        expect(combatant.state.maxHealth).toBeGreaterThanOrEqual(min);
        expect(combatant.state.maxHealth).toBeLessThanOrEqual(max);
        expect(combatant.state.health).toBe(combatant.state.maxHealth);
    });
});
