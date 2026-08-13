import { describe, expect, it, beforeEach } from 'vitest';
import { GAME_RULES, getCardDefinitionOrThrow } from '../config/cardRegistry';
import { ORTHOGONAL_DIRECTIONS } from './cardDirections';
import { buildPlayerDeck, getDefaultDeckDefinitionIds, isOrthogonalDirection } from './buildPlayerDeck';
import { resetCardInstanceCounter } from './createCardInstance';

describe('buildPlayerDeck', () =>
{
    beforeEach(() =>
    {
        resetCardInstanceCounter();
    });

    it('builds a synergy-seeded Runner starter kit', () =>
    {
        const deck = buildPlayerDeck(GAME_RULES.deckSize);
        const ids = getDefaultDeckDefinitionIds();

        expect(deck).toHaveLength(20);
        expect(ids).toHaveLength(20);
        expect(deck.filter((card) => card.definitionId === 'attack')).toHaveLength(3);
        expect(deck.filter((card) => card.definitionId === 'defend')).toHaveLength(3);
        expect(deck.filter((card) => card.definitionId === 'attack-leap')).toHaveLength(2);
        expect(deck.filter((card) => card.definitionId === 'defend-leap')).toHaveLength(2);
        expect(deck.filter((card) => card.definitionId === 'joker')).toHaveLength(1);
        expect(deck.filter((card) => card.definitionId === 'echo')).toHaveLength(1);
        expect(deck.filter((card) => card.definitionId === 'fire')).toHaveLength(1);
        expect(deck.filter((card) => card.definitionId === 'poison')).toHaveLength(1);
        expect(deck.filter((card) => card.definitionId === 'rupture')).toHaveLength(1);
        expect(deck.filter((card) => card.definitionId === 'bulwark')).toHaveLength(1);
        expect(deck.filter((card) => card.definitionId === 'surge')).toHaveLength(1);
        expect(deck.filter((card) => card.definitionId === 'overclock')).toHaveLength(1);
        expect(deck.filter((card) => card.definitionId === 'hardwire')).toHaveLength(1);
        expect(deck.filter((card) => card.definitionId === 'glitch')).toHaveLength(1);
        expect(deck.some((card) => card.definitionId === 'patch')).toBe(false);
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

    it('biases orthogonal arrows toward right and keeps left scarce', () =>
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

        expect(orthogonalCards).toHaveLength(18);

        const countDirection = (direction: typeof ORTHOGONAL_DIRECTIONS[number]): number =>
            orthogonalCards.reduce((count, card) =>
                count + (card.arrow === direction ? 1 : 0), 0);

        const right = countDirection('right');
        const left = countDirection('left');
        const up = countDirection('up');
        const down = countDirection('down');

        expect(right + up + down + left).toBe(18);
        expect(right).toBeGreaterThan(up);
        expect(right).toBeGreaterThan(down);
        expect(left).toBeLessThanOrEqual(up);
        expect(left).toBeLessThanOrEqual(down);
        expect(left).toBeLessThan(right);
    });
});
