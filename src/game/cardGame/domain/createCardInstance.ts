import { getCardDefinitionOrThrow } from '../config/cardRegistry';
import { randomDirectionForPool, randomOrthogonalPair, type CardDirection } from './cardDirections';
import type { CardInstance, CardOwner } from './types';

let instanceCounter = 0;

const isLoopResetDefinitionId = (definitionId: string): boolean =>
    getCardDefinitionOrThrow(definitionId).behaviorId === 'loop-reset';

export const createCardInstance = (
    definitionId: string,
    arrow?: CardDirection,
    owner: CardOwner = 'player',
    loopArrow?: CardDirection,
): CardInstance =>
{
    const definition = getCardDefinitionOrThrow(definitionId);

    if (isLoopResetDefinitionId(definitionId))
    {
        const pair = arrow && loopArrow
            ? { arrow, loopArrow }
            : arrow
                ? { arrow, loopArrow: loopArrow ?? randomOrthogonalPair(arrow).loopArrow }
                : randomOrthogonalPair();

        return {
            instanceId: `${definitionId}-${++instanceCounter}`,
            definitionId,
            arrow: pair.arrow,
            loopArrow: pair.loopArrow,
            owner,
        };
    }

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
