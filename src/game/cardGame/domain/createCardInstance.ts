import { getCardDefinitionOrThrow } from '../config/cardRegistry';
import { randomDirectionForPool, type CardDirection } from './cardDirections';
import type { CardInstance, CardOwner } from './types';

let instanceCounter = 0;

export const createCardInstance = (
    definitionId: string,
    arrow?: CardDirection,
    owner: CardOwner = 'player',
): CardInstance =>
{
    const definition = getCardDefinitionOrThrow(definitionId);

    return {
        instanceId: `${definitionId}-${++instanceCounter}`,
        definitionId,
        arrow: arrow ?? randomDirectionForPool(definition.arrowPool),
        owner,
    };
};

export const resetCardInstanceCounter = (): void =>
{
    instanceCounter = 0;
};
