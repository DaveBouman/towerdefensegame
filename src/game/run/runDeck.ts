import { getCardDefinitionOrThrow } from '../cardGame/config/cardRegistry';
import type { CardDirection } from '../cardGame/domain/cardDirections';

/** One card in the run deck — arrow is fixed when set at reward pick time. */
export interface RunDeckCard {
    definitionId: string;
    arrow?: CardDirection;
    loopArrow?: CardDirection;
}

export const toDefinitionIds = (deck: readonly RunDeckCard[]): string[] =>
    deck.map((card) => card.definitionId);

export const fromDefinitionIds = (definitionIds: readonly string[]): RunDeckCard[] =>
    definitionIds.map((definitionId) => ({ definitionId }));

/** Preserves arrows on existing cards when event effects return a flat id list. */
export const mergeDeckAfterEvent = (
    before: readonly RunDeckCard[],
    afterIds: readonly string[],
): RunDeckCard[] =>
{
    const pool = [ ...before ];

    return afterIds.map((definitionId) =>
    {
        const index = pool.findIndex((card) => card.definitionId === definitionId);

        if (index >= 0)
        {
            return pool.splice(index, 1)[0]!;
        }

        return { definitionId };
    });
};

export interface RunDeckEntry {
    definitionId: string;
    label: string;
    count: number;
    arrow?: CardDirection;
    loopArrow?: CardDirection;
}

/** Groups deck copies that share definition + arrow assignment. */
export const groupRunDeckEntries = (deck: readonly RunDeckCard[]): RunDeckEntry[] =>
{
    const counts = new Map<string, { card: RunDeckCard; count: number }>();

    for (const card of deck)
    {
        const key = `${card.definitionId}:${card.arrow ?? ''}:${card.loopArrow ?? ''}`;
        const existing = counts.get(key);

        if (existing)
        {
            existing.count += 1;
        }
        else
        {
            counts.set(key, { card, count: 1 });
        }
    }

    return [ ...counts.values() ]
        .map(({ card, count }) => ({
            definitionId: card.definitionId,
            label: getCardDefinitionOrThrow(card.definitionId).label,
            count,
            arrow: card.arrow,
            loopArrow: card.loopArrow,
        }))
        .sort((a, b) => a.label.localeCompare(b.label));
};

export const removeFirstCardByDefinitionId = (
    deck: readonly RunDeckCard[],
    definitionId: string,
): RunDeckCard[] =>
{
    const index = deck.findIndex((card) => card.definitionId === definitionId);

    if (index < 0)
    {
        return [ ...deck ];
    }

    return [ ...deck.slice(0, index), ...deck.slice(index + 1) ];
};
