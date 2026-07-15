import { describe, expect, it } from 'vitest';
import { summarizeBattleModifiers, isPlayerBeneficialModifier } from './battleModifierDisplay';

describe('battleModifierDisplay', () =>
{
    it('groups modifiers by stat for status icons', () =>
    {
        const entries = summarizeBattleModifiers([
            { stat: 'player-armor', delta: 0.1, source: 'player' },
            { stat: 'player-armor', delta: 0.1, source: 'enemy' },
            { stat: 'enemy-attack', delta: -0.1, source: 'player' },
        ]);

        expect(entries).toHaveLength(2);
        expect(entries.find((entry) => entry.stat === 'player-armor')?.delta).toBe(0.2);
        expect(entries.find((entry) => entry.stat === 'enemy-attack')?.delta).toBe(-0.1);
    });

    it('classifies player-beneficial modifiers', () =>
    {
        expect(isPlayerBeneficialModifier('enemy-attack', -0.1)).toBe(true);
        expect(isPlayerBeneficialModifier('enemy-attack', 0.1)).toBe(false);
        expect(isPlayerBeneficialModifier('player-damage-dealt', 0.1)).toBe(true);
    });
});
