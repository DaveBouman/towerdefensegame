import { GAME_RULES, getCardDefinitionOrThrow } from '../config/cardRegistry';
import type { ArrowPool, CardDirection } from './cardDirections';
import { buildBalancedDirectionsForPool, DIAGONAL_DIRECTIONS, ORTHOGONAL_DIRECTIONS, randomOrthogonalPair } from './cardDirections';
import { createCardInstance } from './createCardInstance';
import type { CardInstance } from './types';
import { shuffleInPlace } from '../../random/rng';

export { shuffleInPlace };

const DECK_COMPOSITION: readonly { definitionId: string; count: number }[] = [
    { definitionId: 'attack', count: 4 },
    { definitionId: 'defend', count: 3 },
    { definitionId: 'attack-leap', count: 3 },
    { definitionId: 'defend-leap', count: 3 },
    { definitionId: 'joker', count: 2 },
    { definitionId: 'loop-reset', count: 1 },
    { definitionId: 'poison', count: 2 },
    { definitionId: 'fire', count: 2 },
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

        const arrowSlots = entry.definitionId === 'loop-reset' ? entry.count * 2 : entry.count;

        counts.set(pool, (counts.get(pool) ?? 0) + arrowSlots);
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

            if (definition.behaviorId === 'loop-reset')
            {
                const pool = arrowQueues.get(definition.arrowPool) ?? [];
                const arrow = takeBalancedArrow(arrowQueues, definition.arrowPool);
                const loopArrowIndex = pool.findIndex((direction) => direction !== arrow);
                const loopArrow = loopArrowIndex >= 0
                    ? pool.splice(loopArrowIndex, 1)[0]
                    : arrow
                        ? randomOrthogonalPair(arrow).loopArrow
                        : undefined;

                if (!arrow || !loopArrow)
                {
                    const pair = randomOrthogonalPair(arrow);

                    deck.push(createCardInstance(
                        entry.definitionId,
                        pair.arrow,
                        'player',
                        pair.loopArrow,
                    ));
                    continue;
                }

                deck.push(createCardInstance(entry.definitionId, arrow, 'player', loopArrow));
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
