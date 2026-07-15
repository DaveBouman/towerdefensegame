import { getCardDefinitionOrThrow } from '../config/cardRegistry';
import type { BoardModel } from './BoardModel';
import type { CardInstance, SlotPosition } from './types';
import {
    type ArrowPool,
    type CardDirection,
    DIAGONAL_DIRECTIONS,
    getInBoundsDirections,
    getNextSlot,
    oppositeDirection,
    ORTHOGONAL_DIRECTIONS,
} from './cardDirections';
import { pickRandom } from '../../random/rng';

export interface PickFieldCardArrowOptions {
    /** Never pick this outgoing direction (used when fixing ping-pong pairs). */
    avoidDirection?: CardDirection;
}

const directionsForPool = (pool: ArrowPool): readonly CardDirection[] =>
    pool === 'diagonal' ? DIAGONAL_DIRECTIONS : ORTHOGONAL_DIRECTIONS;

const isAmbientBoardCard = (card: CardInstance): boolean =>
    card.owner === 'field' || card.owner === 'enemy';

const isBoostCard = (card: CardInstance): boolean =>
    card.definitionId === 'boost';

/** Picks an arrow for a trap or field boost that can chain through neighbors. */
export const pickFieldCardArrow = (
    board: BoardModel,
    slot: SlotPosition,
    pool: ArrowPool,
    options: PickFieldCardArrowOptions = {},
): CardDirection =>
{
    const poolDirections = directionsForPool(pool);
    let valid = getInBoundsDirections(slot, board.rows, board.cols)
        .filter((direction) => poolDirections.includes(direction));

    if (options.avoidDirection)
    {
        valid = valid.filter((direction) => direction !== options.avoidDirection);
    }

    if (valid.length === 0)
    {
        return poolDirections[0] ?? 'right';
    }

    const towardAmbient = valid.filter((direction) =>
    {
        const next = getNextSlot(slot, direction, board.rows, board.cols);

        if (!next)
        {
            return false;
        }

        const card = board.getCardAt(next);

        return card !== null && isAmbientBoardCard(card);
    });

    return pickRandom(towardAmbient.length > 0 ? towardAmbient : valid);
};

/** Breaks two-step trap/boost loops after placing a field or enemy card. */
export const reconcileFieldCardArrows = (
    board: BoardModel,
    placedSlot: SlotPosition,
): void =>
{
    const placed = board.getCardAt(placedSlot);

    if (!placed || !isAmbientBoardCard(placed))
    {
        return;
    }

    const placedDefinition = getCardDefinitionOrThrow(placed.definitionId);

    for (const direction of directionsForPool(placedDefinition.arrowPool))
    {
        const neighborSlot = getNextSlot(placedSlot, direction, board.rows, board.cols);

        if (!neighborSlot)
        {
            continue;
        }

        const neighbor = board.getCardAt(neighborSlot);

        if (!neighbor || !isAmbientBoardCard(neighbor))
        {
            continue;
        }

        const returnDirection = oppositeDirection(direction);

        if (placed.arrow !== direction || neighbor.arrow !== returnDirection)
        {
            continue;
        }

        const cardToFix = isBoostCard(placed) || isBoostCard(neighbor)
            ? (isBoostCard(placed) ? placed : neighbor)
            : placed;
        const slotToFix = cardToFix === placed ? placedSlot : neighborSlot;
        const avoidDirection = cardToFix === placed ? direction : returnDirection;
        const definition = getCardDefinitionOrThrow(cardToFix.definitionId);

        cardToFix.arrow = pickFieldCardArrow(
            board,
            slotToFix,
            definition.arrowPool,
            { avoidDirection },
        );
    }
};
