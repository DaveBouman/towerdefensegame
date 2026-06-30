import { describe, expect, it, beforeEach } from 'vitest';
import { GAME_RULES } from '../../config/cardRegistry';
import { createCardInstance, resetCardInstanceCounter } from '../../domain/createCardInstance';
import {
    getCardTooltipProvider,
    registerCardTooltipProvider,
    resolveCardTooltip,
} from './cardTooltipRegistry';

describe('cardTooltipRegistry', () =>
{
    beforeEach(() =>
    {
        resetCardInstanceCounter();
    });

    it('describes attack cards using their power', () =>
    {
        const tooltip = resolveCardTooltip(createCardInstance('attack', 'right'));

        expect(tooltip.title).toBe('Attack');
        expect(tooltip.lines[0]).toBe('Deals 5 damage when activated in the chain.');
    });

    it('describes fire alternation bonus from game rules', () =>
    {
        const tooltip = resolveCardTooltip(createCardInstance('fire', 'right'));

        expect(tooltip.title).toBe('Fire');
        expect(tooltip.lines.some((line) =>
            line.includes(String(GAME_RULES.chainAbilities.fireAlternation.bonusDamagePerAlternatingStep)),
        )).toBe(true);
    });

    it('uses definition-specific providers for strike and lunge cards', () =>
    {
        const strike = resolveCardTooltip(createCardInstance('attack-special', 'up-right'));
        const lunge = resolveCardTooltip(createCardInstance('attack-leap', 'right'));

        expect(strike.lines.some((line) => line.includes('2 times'))).toBe(true);
        expect(lunge.lines.some((line) => line.includes('2 tiles'))).toBe(true);
    });

    it('describes loop arrows using this card instance', () =>
    {
        const tooltip = resolveCardTooltip(createCardInstance('loop-reset', 'right', 'player', 'left'));

        expect(tooltip.title).toBe('Loop');
        expect(tooltip.lines[1]).toContain('↺←');
        expect(tooltip.lines[2]).toContain('→');
    });

    it('allows registering custom tooltip providers', () =>
    {
        const previous = getCardTooltipProvider('fire');

        registerCardTooltipProvider({
            id: 'fire',
            getTooltip: () => ({
                title: 'Custom Fire',
                lines: [ 'Does something special.' ],
            }),
        });

        expect(resolveCardTooltip(createCardInstance('fire', 'right')).title).toBe('Custom Fire');

        if (previous)
        {
            registerCardTooltipProvider(previous);
        }
    });
});
