import { GAME_RULES, getCardDefinitionOrThrow } from '../config/cardRegistry';
import type { ArrowPool, CardDirection } from './cardDirections';
import { buildBalancedDirectionsForPool, DIAGONAL_DIRECTIONS, ORTHOGONAL_DIRECTIONS } from './cardDirections';
import { createCardInstance } from './createCardInstance';
import type { CardInstance } from './types';
import { shuffleInPlace } from '../../random/rng';

export { shuffleInPlace };

const DECK_COMPOSITION: readonly { definitionId: string; count: number }[] = [
    { definitionId: 'attack', count: 3 },
    { definitionId: 'defend', count: 3 },
    { definitionId: 'attack-leap', count: 2 },
    { definitionId: 'defend-leap', count: 2 },
    { definitionId: 'joker', count: 1 },
    { definitionId: 'echo', count: 1 },
    { definitionId: 'poison', count: 1 },
    { definitionId: 'fire', count: 1 },
    { definitionId: 'shiv', count: 1 },
    { definitionId: 'cinder', count: 1 },
    { definitionId: 'miasma', count: 1 },
    { definitionId: 'lacerate', count: 1 },
    { definitionId: 'patch', count: 1 },
    { definitionId: 'glitch', count: 1 },
];

/** The card definition ids that make up a fresh starting deck. */
export const getDefaultDeckDefinitionIds = (): string[] =>
    DECK_COMPOSITION.flatMap(({ definitionId, count }) =>
        Array.from({ length: count }, () => definitionId));

/** Builds a shuffled deck of card instances from a list of definition ids. */
export const buildDeckFromDefinitionIds = (definitionIds: readonly string[]): CardInstance[] =>
    shuffleInPlace(definitionIds.map((id) => createCardInstance(id)));

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
