import type { SlotPosition } from './types';

export type CardDirection =
    | 'up'
    | 'down'
    | 'left'
    | 'right'
    | 'up-left'
    | 'up-right'
    | 'down-left'
    | 'down-right';

export const CARD_DIRECTIONS: readonly CardDirection[] = [
    'up',
    'down',
    'left',
    'right',
    'up-left',
    'up-right',
    'down-left',
    'down-right',
];

export const ORTHOGONAL_DIRECTIONS: readonly CardDirection[] = [ 'up', 'down', 'left', 'right' ];

export const DIAGONAL_DIRECTIONS: readonly CardDirection[] = [
    'up-left',
    'up-right',
    'down-left',
    'down-right',
];

export type ArrowPool = 'orthogonal' | 'diagonal' | 'joker';

/** Placeholder arrow stored on joker instances — direction is chosen during attack. */
export const JOKER_PLACEHOLDER_ARROW: CardDirection = 'right';

const OFFSETS: Record<CardDirection, { row: number; col: number }> = {
    up: { row: -1, col: 0 },
    down: { row: 1, col: 0 },
    left: { row: 0, col: -1 },
    right: { row: 0, col: 1 },
    'up-left': { row: -1, col: -1 },
    'up-right': { row: -1, col: 1 },
    'down-left': { row: 1, col: -1 },
    'down-right': { row: 1, col: 1 },
};

export const randomCardDirection = (): CardDirection =>
    CARD_DIRECTIONS[Math.floor(Math.random() * CARD_DIRECTIONS.length)];

export const randomDirectionForPool = (pool: ArrowPool): CardDirection =>
{
    if (pool === 'joker')
    {
        return JOKER_PLACEHOLDER_ARROW;
    }

    const directions = pool === 'diagonal' ? DIAGONAL_DIRECTIONS : ORTHOGONAL_DIRECTIONS;

    return directions[Math.floor(Math.random() * directions.length)];
};

export const getInBoundsDirections = (
    slot: SlotPosition,
    rows: number,
    cols: number,
): CardDirection[] =>
    CARD_DIRECTIONS.filter((direction) => getNextSlot(slot, direction, rows, cols) !== null);

export const slotKey = ({ row, col }: SlotPosition): string => `${row},${col}`;

export const getNextSlot = (
    { row, col }: SlotPosition,
    direction: CardDirection,
    rows: number,
    cols: number,
): SlotPosition | null =>
{
    const offset = OFFSETS[direction];
    const next = { row: row + offset.row, col: col + offset.col };

    if (next.row < 0 || next.row >= rows || next.col < 0 || next.col >= cols)
    {
        return null;
    }

    return next;
};
