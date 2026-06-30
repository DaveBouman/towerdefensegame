import { GAME_RULES, getCardDefinitionOrThrow } from '../config/cardRegistry';
import type { ArrowPool, CardDirection } from './cardDirections';
import { buildBalancedDirectionsForPool, DIAGONAL_DIRECTIONS, ORTHOGONAL_DIRECTIONS } from './cardDirections';
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
    { definitionId: 'attack', count: 5 },
    { definitionId: 'defend', count: 4 },
    { definitionId: 'attack-leap', count: 3 },
    { definitionId: 'defend-leap', count: 3 },
    { definitionId: 'joker', count: 2 },
    { definitionId: 'loop-reset', count: 1 },
    { definitionId: 'poison', count: 2 },
];

const buildBalancedArrowQueues = (): Map<ArrowPool, CardDirection[]> =>
{
    const counts = new Map<ArrowPool, number>();

    for (const entry of DECK_COMPOSITION)
    {
        const pool = getCardDefinitionOrThrow(entry.definitionId).arrowPool;

        if (pool === 'joker')
        {
            continue;
        }

        counts.set(pool, (counts.get(pool) ?? 0) + entry.count);
    }

    const queues = new Map<ArrowPool, CardDirection[]>();

    for (const [ pool, count ] of counts)
    {
        queues.set(pool, buildBalancedDirectionsForPool(pool, count, shuffleInPlace));
    }

    return queues;
};

const takeBalancedArrow = (
    queues: Map<ArrowPool, CardDirection[]>,
    pool: ArrowPool,
): CardDirection | undefined =>
    queues.get(pool)?.shift();

/** Builds a shuffled deck with evenly distributed arrows per arrow pool. */
export const buildPlayerDeck = (size = GAME_RULES.deckSize): CardInstance[] =>
{
    const arrowQueues = buildBalancedArrowQueues();
    const deck: CardInstance[] = [];

    for (const entry of DECK_COMPOSITION)
    {
        const definition = getCardDefinitionOrThrow(entry.definitionId);

        for (let i = 0; i < entry.count; i++)
        {
            if (definition.arrowPool === 'joker')
            {
                deck.push(createCardInstance(entry.definitionId));
                continue;
            }

            const arrow = takeBalancedArrow(arrowQueues, definition.arrowPool);

            deck.push(createCardInstance(entry.definitionId, arrow));
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
