import {
    canUpgradeCard,
    getCardDefinitionOrThrow,
} from '../cardGame/config/cardRegistry';
import type { RunDeckCard, RunDeckEntry } from './runDeck';
import { matchesDeckEntry, toDefinitionIds } from './runDeck';

/** Definition ids in the deck that still have an unused upgrade. */
export const listUpgradableCardsInDeck = (deck: readonly RunDeckCard[]): string[] =>
{
    const seen = new Set<string>();
    const result: string[] = [];

    for (const definitionId of toDefinitionIds(deck))
    {
        if (seen.has(definitionId) || !canUpgradeCard(definitionId))
        {
            continue;
        }

        seen.add(definitionId);
        result.push(definitionId);
    }

    return result.sort((a, b) =>
        getCardDefinitionOrThrow(a).label.localeCompare(getCardDefinitionOrThrow(b).label));
};

/**
 * Replaces the first copy of `definitionId` with its upgraded form.
 * Returns null if the card is missing or already upgraded.
 */
export const upgradeFirstCardInDeck = (
    deck: readonly RunDeckCard[],
    definitionId: string,
): RunDeckCard[] | null =>
{
    const definition = getCardDefinitionOrThrow(definitionId);
    const upgradedId = definition.upgradesTo;

    if (!upgradedId)
    {
        return null;
    }

    const index = deck.findIndex((card) => card.definitionId === definitionId);

    if (index < 0)
    {
        return null;
    }

    const next = [ ...deck ];
    const card = next[index]!;

    next[index] = {
        ...card,
        definitionId: upgradedId,
    };

    return next;
};

/**
 * Replaces one specific deck copy (matched by entry) with its upgraded form.
 */
export const upgradeMatchingDeckEntry = (
    deck: readonly RunDeckCard[],
    entry: RunDeckEntry,
): RunDeckCard[] | null =>
{
    const definition = getCardDefinitionOrThrow(entry.definitionId);
    const upgradedId = definition.upgradesTo;

    if (!upgradedId)
    {
        return null;
    }

    const index = deck.findIndex((card) => matchesDeckEntry(card, entry));

    if (index < 0)
    {
        return null;
    }

    const next = [ ...deck ];
    const card = next[index]!;

    next[index] = {
        ...card,
        definitionId: upgradedId,
    };

    return next;
};
