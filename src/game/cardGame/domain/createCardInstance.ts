import { getCardDefinitionOrThrow } from '../config/cardRegistry';
import { randomDirectionForPool, type CardDirection } from './cardDirections';
import type { CardInstance } from './types';

let instanceCounter = 0;

export const createCardInstance = (
    definitionId: string,
    arrow?: CardDirection,
): CardInstance =>
{
    const definition = getCardDefinitionOrThrow(definitionId);

    return {
        instanceId: `${definitionId}-${++instanceCounter}`,
        definitionId,
        arrow: arrow ?? randomDirectionForPool(definition.arrowPool),
    };
};

export const resetCardInstanceCounter = (): void =>
{
    instanceCounter = 0;
};
