import {
    canUpgradeCard,
    getCardDefinitionOrThrow,
} from '../cardGame/config/cardRegistry';

/** Definition ids in the deck that still have an unused upgrade. */
export const listUpgradableCardsInDeck = (deck: readonly string[]): string[] =>
{
    const seen = new Set<string>();
    const result: string[] = [];

    for (const definitionId of deck)
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
    deck: readonly string[],
    definitionId: string,
): string[] | null =>
{
    const definition = getCardDefinitionOrThrow(definitionId);
    const upgradedId = definition.upgradesTo;

    if (!upgradedId)
    {
        return null;
    }

    const index = deck.indexOf(definitionId);

    if (index < 0)
    {
        return null;
    }

    const next = [ ...deck ];

    next[index] = upgradedId;

    return next;
};
