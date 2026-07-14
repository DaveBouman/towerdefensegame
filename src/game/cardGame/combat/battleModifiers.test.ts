import { describe, expect, it } from 'vitest';
import {
    aggregateBattleModifiers,
    applyBattleModifier,
    applyPlayerBuffModifier,
    formatBattleModifierDelta,
    scaleIncomingDamage,
} from './battleModifiers';

describe('battleModifiers', () =>
{
    it('stacks percentage deltas additively', () =>
    {
        const totals = aggregateBattleModifiers([
            { stat: 'player-armor', delta: 0.1, source: 'player' },
            { stat: 'player-armor', delta: 0.1, source: 'enemy' },
        ]);

        expect(totals.playerArmor).toBe(0.2);
    });

    it('applies a +10% modifier with flooring', () =>
    {
        expect(applyBattleModifier(10, 0.1)).toBe(11);
        expect(applyBattleModifier(3, 0.1)).toBe(3);
        expect(applyBattleModifier(13, -0.1)).toBe(11);
    });

    it('rounds incoming damage once in the defender\'s favor', () =>
    {
        expect(scaleIncomingDamage(13, 0, -0.1)).toBe(11);
        expect(scaleIncomingDamage(13, -0.1, -0.1)).toBe(10);
        expect(scaleIncomingDamage(13, 0.1, -0.1)).toBe(12);
    });

    it('rounds player buffs up in the player\'s favor', () =>
    {
        expect(applyPlayerBuffModifier(10, 0.1)).toBe(11);
        expect(applyPlayerBuffModifier(3, 0.1)).toBe(4);
    });

    it('formats signed percent labels', () =>
    {
        expect(formatBattleModifierDelta(0.1)).toBe('+10%');
        expect(formatBattleModifierDelta(-0.1)).toBe('-10%');
    });
});
