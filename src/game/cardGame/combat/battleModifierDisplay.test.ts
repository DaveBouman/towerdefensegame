import { describe, expect, it } from 'vitest';
import {
    summarizeBattleModifiers,
    isPlayerBeneficialModifier,
    getBattleModifierAnchor,
} from './battleModifierDisplay';

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

    it('anchors enemy-attack under the enemy and other stats under the player', () =>
    {
        expect(getBattleModifierAnchor('enemy-attack')).toBe('enemy');
        expect(getBattleModifierAnchor('player-armor')).toBe('player');
        expect(getBattleModifierAnchor('player-damage-taken')).toBe('player');
        expect(getBattleModifierAnchor('player-damage-dealt')).toBe('player');
    });

    it('uses distinct icon tints per stat and polarity-colored badge text', () =>
    {
        const entries = summarizeBattleModifiers([
            { stat: 'enemy-attack', delta: 0.1, source: 'enemy' },
            { stat: 'player-armor', delta: 0.1, source: 'player' },
            { stat: 'player-damage-dealt', delta: -0.1, source: 'enemy' },
            { stat: 'player-damage-taken', delta: 0.1, source: 'enemy' },
        ]);

        const byStat = Object.fromEntries(entries.map((entry) => [ entry.stat, entry ]));

        expect(byStat['enemy-attack']?.tint).not.toBe(byStat['player-armor']?.tint);
        expect(byStat['player-armor']?.tint).not.toBe(byStat['player-damage-dealt']?.tint);
        expect(byStat['player-damage-dealt']?.tint).not.toBe(byStat['player-damage-taken']?.tint);

        expect(byStat['player-armor']?.textColor).toBe('#00ff9d');
        expect(byStat['enemy-attack']?.textColor).toBe('#ff8a84');
        expect(byStat['player-armor']?.anchor).toBe('player');
        expect(byStat['enemy-attack']?.anchor).toBe('enemy');
    });
});
