import { describe, expect, it } from 'vitest';
import { EnemyOverclockTracker, getEnemyDamageRamp } from './enemyOverclock';
import { GAME_RULES } from '../config/cardRegistry';

describe('enemyOverclock', () =>
{
    it('tracks fight-long overclock stacks', () =>
    {
        const tracker = new EnemyOverclockTracker();
        const perTurn = GAME_RULES.enemyStrengthPerTurn ?? 0;

        expect(tracker.getBonus()).toBe(0);
        expect(tracker.getNextBonus()).toBe(perTurn);

        tracker.tick();
        expect(tracker.getBonus()).toBe(perTurn);
        expect(tracker.getNextBonus()).toBe(perTurn * 2);
    });

    it('stays inert in puzzle mode', () =>
    {
        const tracker = new EnemyOverclockTracker(true);

        tracker.tick();
        expect(tracker.getBonus()).toBe(0);
        expect(tracker.getNextBonus()).toBe(0);
    });

    it('ramps damage after the first attack in a round', () =>
    {
        const perAttack = GAME_RULES.enemyDamageRampPerAttack ?? 0;

        expect(getEnemyDamageRamp(0)).toBe(0);
        expect(getEnemyDamageRamp(1)).toBe(0);
        expect(getEnemyDamageRamp(2)).toBe(perAttack);
        expect(getEnemyDamageRamp(3)).toBe(perAttack * 2);
    });
});
