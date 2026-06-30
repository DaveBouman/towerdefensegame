import { describe, expect, it, beforeEach } from 'vitest';
import { GAME_RULES } from '../config/cardRegistry';
import { buildPlayerDeck, isOrthogonalDirection } from './buildPlayerDeck';
import { resetCardInstanceCounter } from './createCardInstance';

describe('buildPlayerDeck', () =>
{
    beforeEach(() =>
    {
        resetCardInstanceCounter();
    });

    it('builds a deck with attack, defend, leap, and joker cards', () =>
    {
        const deck = buildPlayerDeck(15);

        expect(deck).toHaveLength(15);
        expect(deck.filter((card) => card.definitionId === 'attack')).toHaveLength(4);
        expect(deck.filter((card) => card.definitionId === 'defend')).toHaveLength(4);
        expect(deck.filter((card) => card.definitionId === 'attack-leap')).toHaveLength(2);
        expect(deck.filter((card) => card.definitionId === 'defend-leap')).toHaveLength(2);
        expect(deck.filter((card) => card.definitionId === 'joker')).toHaveLength(3);
    });

    it('uses orthogonal arrows for attack and defend deck cards', () =>
    {
        const deck = buildPlayerDeck(GAME_RULES.deckSize);

        for (const card of deck)
        {
            if (card.definitionId === 'joker')
            {
                continue;
            }

            expect(isOrthogonalDirection(card.arrow)).toBe(true);
        }
    });
});
