import { describe, expect, it, beforeEach } from 'vitest';
import { CARD_DEFINITIONS, GAME_RULES, getCardDefinition } from './cardRegistry';
import { createCardInstance, resetCardInstanceCounter } from '../domain/createCardInstance';
import { CARD_DIRECTIONS } from '../domain/cardDirections';

describe('cardRegistry', () =>
{
    beforeEach(() =>
    {
        resetCardInstanceCounter();
    });

    it('loads card definitions from cards.json', () =>
    {
        expect(CARD_DEFINITIONS).toHaveLength(4);
        expect(getCardDefinition('attack')?.arrowPool).toBe('orthogonal');
        expect(getCardDefinition('defend')?.arrowPool).toBe('orthogonal');
        expect(getCardDefinition('attack-special')?.maxChainActivations).toBe(2);
        expect(getCardDefinition('defend-special')?.arrowPool).toBe('diagonal');
    });

    it('loads game rules and deck settings', () =>
    {
        expect(GAME_RULES.deckSize).toBe(12);
        expect(GAME_RULES.handSize).toBe(6);
        expect(GAME_RULES.activationStartColumn).toBe(0);
        expect(GAME_RULES.enemy.maxHealth).toBeGreaterThan(0);
    });

    it('creates unique card instances with pool-based arrows', () =>
    {
        const a = createCardInstance('attack', 'up');
        const b = createCardInstance('attack-special', 'down-right');

        expect(a.instanceId).not.toBe(b.instanceId);
        expect(a.definitionId).toBe('attack');
        expect(a.arrow).toBe('up');
        expect(b.arrow).toBe('down-right');
        expect(CARD_DIRECTIONS).toHaveLength(8);
    });
});
