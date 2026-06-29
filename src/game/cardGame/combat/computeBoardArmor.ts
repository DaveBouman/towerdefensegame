import { getCardDefinitionOrThrow } from '../config/cardRegistry';
import type { BoardModel } from '../domain/BoardModel';
import { getCardBehaviorOrThrow } from '../effects/cardBehaviorRegistry';

/** Armor from defend cards in a single row. */
export const computeRowArmor = (board: BoardModel, row: number): number =>
{
    let armor = 0;

    for (let col = 0; col < board.cols; col++)
    {
        const slot = { row, col };
        const card = board.getCardAt(slot);

        if (!card)
        {
            continue;
        }

        const definition = getCardDefinitionOrThrow(card.definitionId);
        const behavior = getCardBehaviorOrThrow(definition.behaviorId);
        const contribution = behavior.contributeArmor?.({
            board,
            slot,
            card,
            definition,
        }) ?? 0;

        armor += contribution;
    }

    return armor;
};
