import { describe, expect, it } from 'vitest';
import {
    aggregateBattleModifiers,
    applyBattleModifier,
    formatBattleModifierDelta,
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

    it('formats signed percent labels', () =>
    {
        expect(formatBattleModifierDelta(0.1)).toBe('+10%');
        expect(formatBattleModifierDelta(-0.1)).toBe('-10%');
    });
});
