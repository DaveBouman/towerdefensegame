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

    it('builds a deck with attack, defend, leap, and joker cards', () =>
    {
        const deck = buildPlayerDeck(GAME_RULES.deckSize);

        expect(deck).toHaveLength(20);
        expect(deck.filter((card) => card.definitionId === 'attack')).toHaveLength(3);
        expect(deck.filter((card) => card.definitionId === 'defend')).toHaveLength(3);
        expect(deck.filter((card) => card.definitionId === 'fire')).toHaveLength(1);
        expect(deck.filter((card) => card.definitionId === 'attack-leap')).toHaveLength(2);
        expect(deck.filter((card) => card.definitionId === 'defend-leap')).toHaveLength(2);
        expect(deck.filter((card) => card.definitionId === 'joker')).toHaveLength(1);
        expect(deck.filter((card) => card.definitionId === 'echo')).toHaveLength(1);
        expect(deck.filter((card) => card.definitionId === 'loop-reset')).toHaveLength(1);
        expect(deck.filter((card) => card.definitionId === 'shiv')).toHaveLength(1);
        expect(deck.filter((card) => card.definitionId === 'cinder')).toHaveLength(1);
        expect(deck.filter((card) => card.definitionId === 'miasma')).toHaveLength(1);
        expect(deck.filter((card) => card.definitionId === 'lacerate')).toHaveLength(1);
        expect(deck.filter((card) => card.definitionId === 'patch')).toHaveLength(1);
        expect(deck.filter((card) => card.definitionId === 'glitch')).toHaveLength(1);
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

            if (card.definitionId === 'loop-reset')
            {
                expect(card.loopArrow).toBeDefined();
                expect(isOrthogonalDirection(card.loopArrow!)).toBe(true);
                expect(card.loopArrow).not.toBe(card.arrow);
            }
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

        expect(orthogonalCards).toHaveLength(16);

        const countDirection = (direction: typeof ORTHOGONAL_DIRECTIONS[number]): number =>
            orthogonalCards.reduce((count, card) =>
                count
                + (card.arrow === direction ? 1 : 0)
                + (card.loopArrow === direction ? 1 : 0), 0);

        for (const direction of ORTHOGONAL_DIRECTIONS)
        {
            const count = countDirection(direction);

            expect(count).toBeGreaterThanOrEqual(4);
            expect(count).toBeLessThanOrEqual(5);
        }
    });
});
