import { getCardDefinitionOrThrow } from '../config/cardRegistry';
import type { CardInstance } from './types';

let instanceCounter = 0;

export const createCardInstance = (definitionId: string): CardInstance =>
{
    getCardDefinitionOrThrow(definitionId);

    return {
        instanceId: `${definitionId}-${++instanceCounter}`,
        definitionId,
    };
};

export const resetCardInstanceCounter = (): void =>
{
    instanceCounter = 0;
};
