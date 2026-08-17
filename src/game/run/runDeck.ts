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

/** Preserves arrows on existing cards when rebuilding from a flat id list. */
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

export const cardNeedsDirectionPick = (definitionId: string): boolean =>
    getCardDefinitionOrThrow(definitionId).arrowPool !== 'joker';

export const matchesDeckEntry = (card: RunDeckCard, entry: RunDeckEntry): boolean =>
    card.definitionId === entry.definitionId
    && card.arrow === entry.arrow
    && card.loopArrow === entry.loopArrow;

export const removeMatchingDeckEntry = (
    deck: readonly RunDeckCard[],
    entry: RunDeckEntry,
): RunDeckCard[] =>
{
    const next = [ ...deck ];
    const index = next.findIndex((card) => matchesDeckEntry(card, entry));

    if (index >= 0)
    {
        next.splice(index, 1);
    }

    return next;
};

export const setMatchingDeckEntryArrow = (
    deck: readonly RunDeckCard[],
    entry: RunDeckEntry,
    arrow: CardDirection,
): RunDeckCard[] =>
{
    const next = [ ...deck ];
    const index = next.findIndex((card) => matchesDeckEntry(card, entry));

    if (index >= 0)
    {
        next[index] = { ...next[index]!, arrow };
    }

    return next;
};

const countNeedingDirection = (deck: readonly RunDeckCard[]): Map<string, number> =>
{
    const counts = new Map<string, number>();

    for (const card of deck)
    {
        if (cardNeedsDirectionPick(card.definitionId) && !card.arrow)
        {
            counts.set(card.definitionId, (counts.get(card.definitionId) ?? 0) + 1);
        }
    }

    return counts;
};

/** Newly gained cards (from events/shop) that still need a direction choice. */
export const findNewDefinitionIdsNeedingDirection = (
    before: readonly RunDeckCard[],
    after: readonly RunDeckCard[],
): string[] =>
{
    const beforeCounts = countNeedingDirection(before);
    const afterCounts = countNeedingDirection(after);
    const added: string[] = [];

    for (const [ definitionId, count ] of afterCounts)
    {
        const previous = beforeCounts.get(definitionId) ?? 0;

        for (let i = 0; i < count - previous; i++)
        {
            added.push(definitionId);
        }
    }

    return added;
};

/** Applies direction picks to the first matching arrowless copies in deck order. */
export const applyDirectionPicksToDeck = (
    deck: readonly RunDeckCard[],
    picks: readonly RunDeckCard[],
): RunDeckCard[] =>
{
    const next = deck.map((card) => ({ ...card }));

    for (const pick of picks)
    {
        const index = next.findIndex((card) =>
            card.definitionId === pick.definitionId
            && !card.arrow
            && cardNeedsDirectionPick(card.definitionId));

        if (index >= 0)
        {
            next[index] = { ...next[index]!, arrow: pick.arrow };
        }
    }

    return next;
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
