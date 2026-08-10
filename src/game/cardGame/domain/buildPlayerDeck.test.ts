import { describe, expect, it, beforeEach } from 'vitest';
import { GAME_RULES, getCardDefinitionOrThrow } from '../config/cardRegistry';
import { ORTHOGONAL_DIRECTIONS } from './cardDirections';
import { buildPlayerDeck, isOrthogonalDirection } from './buildPlayerDeck';
import { resetCardInstanceCounter } from './createCardInstance';

describe('buildPlayerDeck', () =>
{
    beforeEach(() =>
    {
        resetCardInstanceCounter();
    });

    it('builds a neutral core deck without specialty starters', () =>
    {
        const deck = buildPlayerDeck(GAME_RULES.deckSize);

        expect(deck).toHaveLength(20);
        expect(deck.filter((card) => card.definitionId === 'attack')).toHaveLength(5);
        expect(deck.filter((card) => card.definitionId === 'defend')).toHaveLength(5);
        expect(deck.filter((card) => card.definitionId === 'attack-leap')).toHaveLength(2);
        expect(deck.filter((card) => card.definitionId === 'defend-leap')).toHaveLength(2);
        expect(deck.filter((card) => card.definitionId === 'joker')).toHaveLength(1);
        expect(deck.filter((card) => card.definitionId === 'echo')).toHaveLength(1);
        expect(deck.filter((card) => card.definitionId === 'glitch')).toHaveLength(1);
        expect(deck.filter((card) => card.definitionId === 'patch')).toHaveLength(1);
        expect(deck.filter((card) => card.definitionId === 'hardwire')).toHaveLength(1);
        expect(deck.filter((card) => card.definitionId === 'overclock')).toHaveLength(1);
        expect(deck.some((card) => card.definitionId === 'poison')).toBe(false);
        expect(deck.some((card) => card.definitionId === 'fire')).toBe(false);
        expect(deck.some((card) => card.definitionId === 'shiv')).toBe(false);
    });

    it('uses orthogonal arrows for standard deck cards', () =>
    {
        const deck = buildPlayerDeck(GAME_RULES.deckSize);

        for (const card of deck)
        {
            if (card.definitionId === 'joker')
            {
                continue;
            }

            const definition = getCardDefinitionOrThrow(card.definitionId);

            if (definition.arrowPool === 'diagonal')
            {
                continue;
            }

            expect(isOrthogonalDirection(card.arrow)).toBe(true);
        }
    });

    it('splits orthogonal arrows evenly across the deck', () =>
    {
        const deck = buildPlayerDeck(GAME_RULES.deckSize);
        const orthogonalCards = deck.filter((card) =>
        {
            if (card.definitionId === 'joker')
            {
                return false;
            }

            return getCardDefinitionOrThrow(card.definitionId).arrowPool !== 'diagonal';
        });

        expect(orthogonalCards).toHaveLength(19);

        const countDirection = (direction: typeof ORTHOGONAL_DIRECTIONS[number]): number =>
            orthogonalCards.reduce((count, card) =>
                count + (card.arrow === direction ? 1 : 0), 0);

        const counts = ORTHOGONAL_DIRECTIONS.map(countDirection);

        expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
        expect(counts.reduce((sum, count) => sum + count, 0)).toBe(19);
    });
});
