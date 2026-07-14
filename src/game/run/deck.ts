/** Removes one copy of each definition id from a deck list. */
export const removeCardsFromDeck = (
    deck: readonly string[],
    definitionIdsToRemove: readonly string[],
): string[] =>
{
    const next = [ ...deck ];

    for (const definitionId of definitionIdsToRemove)
    {
        const index = next.indexOf(definitionId);

        if (index >= 0)
        {
            next.splice(index, 1);
        }
    }

    return next;
};
