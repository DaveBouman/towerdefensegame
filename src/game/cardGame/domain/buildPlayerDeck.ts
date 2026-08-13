import { GAME_RULES, getCardDefinitionOrThrow } from '../config/cardRegistry';
import type { RunDeckCard } from '../../run/runDeck';
import type { ArrowPool, CardDirection } from './cardDirections';
import { buildBalancedDirectionsForPool, DIAGONAL_DIRECTIONS, ORTHOGONAL_DIRECTIONS } from './cardDirections';
import { createCardInstance } from './createCardInstance';
import type { CardInstance } from './types';
import { shuffleInPlace } from '../../random/rng';

export { shuffleInPlace };

/**
 * Default Runner starting kit — routing core plus light synergy seeds so fight 1
 * already shows how cards talk to each other. Deeper archetype cards still come
 * from rewards. (Future: swap this table per character.)
 */
const DECK_COMPOSITION: readonly { definitionId: string; count: number }[] = [
    { definitionId: 'attack', count: 3 },
    { definitionId: 'defend', count: 3 },
    { definitionId: 'attack-leap', count: 2 },
    { definitionId: 'defend-leap', count: 2 },
    { definitionId: 'joker', count: 1 },
    { definitionId: 'echo', count: 1 },
    // Synergy seeds — one verb from each major lane.
    { definitionId: 'fire', count: 1 },
    { definitionId: 'poison', count: 1 },
    { definitionId: 'rupture', count: 1 },
    { definitionId: 'bulwark', count: 1 },
    { definitionId: 'surge', count: 1 },
    // Glue: Echo repeats; Overclock/Hardwire/Glitch amplify the board conversation.
    { definitionId: 'overclock', count: 1 },
    { definitionId: 'hardwire', count: 1 },
    { definitionId: 'glitch', count: 1 },
];

/** The card definition ids that make up a fresh starting deck. */
export const getDefaultDeckDefinitionIds = (): string[] =>
    DECK_COMPOSITION.flatMap(({ definitionId, count }) =>
        Array.from({ length: count }, () => definitionId));

/** Starting run deck with balanced arrows per pool (same distribution as `buildPlayerDeck`). */
export const buildDefaultRunDeck = (): RunDeckCard[] =>
{
    const arrowQueues = buildBalancedArrowQueues();
    const cards: RunDeckCard[] = [];

    for (const entry of DECK_COMPOSITION)
    {
        const definition = getCardDefinitionOrThrow(entry.definitionId);

        for (let i = 0; i < entry.count; i++)
        {
            if (definition.arrowPool === 'joker')
            {
                cards.push({ definitionId: entry.definitionId });
                continue;
            }

            const arrow = takeBalancedArrow(arrowQueues, definition.arrowPool);

            cards.push({ definitionId: entry.definitionId, arrow });
        }
    }

    return cards;
};

/** Builds a shuffled deck of card instances from a list of definition ids. */
export const buildDeckFromDefinitionIds = (definitionIds: readonly string[]): CardInstance[] =>
    shuffleInPlace(definitionIds.map((id) => createCardInstance(id)));

/** Builds a shuffled battle deck from run deck entries, preserving chosen arrows. */
export const buildDeckFromRunCards = (cards: readonly RunDeckCard[]): CardInstance[] =>
    shuffleInPlace(cards.map(({ definitionId, arrow, loopArrow }) =>
        createCardInstance(definitionId, arrow, 'player', loopArrow)));

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
