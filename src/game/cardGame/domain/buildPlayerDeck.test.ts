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

    it('builds a deck with 6 attack and 6 defend cards', () =>
    {
        const deck = buildPlayerDeck(12);

        expect(deck).toHaveLength(12);
        expect(deck.filter((card) => card.definitionId === 'attack')).toHaveLength(6);
        expect(deck.filter((card) => card.definitionId === 'defend')).toHaveLength(6);
    });

    it('uses orthogonal arrows for all deck cards', () =>
    {
        const deck = buildPlayerDeck(GAME_RULES.deckSize);

        for (const card of deck)
        {
            expect(isOrthogonalDirection(card.arrow)).toBe(true);
        }
    });
});
