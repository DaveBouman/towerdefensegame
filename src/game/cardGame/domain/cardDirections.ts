import type { SlotPosition } from './types';

export type CardDirection = 'up' | 'down' | 'left' | 'right';

export const CARD_DIRECTIONS: readonly CardDirection[] = [ 'up', 'down', 'left', 'right' ];

const OFFSETS: Record<CardDirection, { row: number; col: number }> = {
    up: { row: -1, col: 0 },
    down: { row: 1, col: 0 },
    left: { row: 0, col: -1 },
    right: { row: 0, col: 1 },
};

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
