import { GAME_RULES } from '../config/cardRegistry';
import { DIAGONAL_DIRECTIONS, ORTHOGONAL_DIRECTIONS } from './cardDirections';
import { createCardInstance } from './createCardInstance';
import type { CardInstance } from './types';

export const shuffleInPlace = <T>(items: T[]): T[] =>
{
    for (let i = items.length - 1; i > 0; i--)
    {
        const j = Math.floor(Math.random() * (i + 1));
        [ items[i], items[j] ] = [ items[j], items[i] ];
    }

    return items;
};

const DECK_COMPOSITION: readonly { definitionId: string; count: number }[] = [
    { definitionId: 'attack', count: 6 },
    { definitionId: 'defend', count: 6 },
    { definitionId: 'joker', count: 3 },
];

/** Builds a shuffled deck of attack and defend cards. */
export const buildPlayerDeck = (size = GAME_RULES.deckSize): CardInstance[] =>
{
    const deck: CardInstance[] = [];

    for (const entry of DECK_COMPOSITION)
    {
        for (let i = 0; i < entry.count; i++)
        {
            deck.push(createCardInstance(entry.definitionId));
        }
    }

    if (deck.length !== size)
    {
        throw new Error(`Deck composition must total ${size} cards, got ${deck.length}`);
    }

    return shuffleInPlace(deck);
};

export const isOrthogonalDirection = (direction: string): boolean =>
    ORTHOGONAL_DIRECTIONS.includes(direction as typeof ORTHOGONAL_DIRECTIONS[number]);

export const isDiagonalDirection = (direction: string): boolean =>
    DIAGONAL_DIRECTIONS.includes(direction as typeof DIAGONAL_DIRECTIONS[number]);
