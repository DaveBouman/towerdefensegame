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

/** Two distinct orthogonal directions for loop cards (continue + loop-back). */
export const randomOrthogonalPair = (
    continueArrow?: CardDirection,
): { arrow: CardDirection; loopArrow: CardDirection } =>
{
    const shuffled = [ ...ORTHOGONAL_DIRECTIONS ];

    for (let i = shuffled.length - 1; i > 0; i--)
    {
        const j = Math.floor(Math.random() * (i + 1));
        [ shuffled[i], shuffled[j] ] = [ shuffled[j], shuffled[i] ];
    }

    if (continueArrow && ORTHOGONAL_DIRECTIONS.includes(continueArrow))
    {
        const loopArrow = shuffled.find((direction) => direction !== continueArrow)
            ?? ORTHOGONAL_DIRECTIONS.find((direction) => direction !== continueArrow)
            ?? 'left';

        return { arrow: continueArrow, loopArrow };
    }

    return {
        arrow: shuffled[0]!,
        loopArrow: shuffled[1]!,
    };
};

const directionsForPool = (pool: ArrowPool): readonly CardDirection[] =>
{
    if (pool === 'joker')
    {
        return [];
    }

    return pool === 'diagonal' ? DIAGONAL_DIRECTIONS : ORTHOGONAL_DIRECTIONS;
};

/** Evenly distributes directions for a pool, then shuffles the assignments. */
export const buildBalancedDirectionsForPool = (
    pool: ArrowPool,
    count: number,
    shuffle: <T>(items: T[]) => T[] = shuffleDirectionsInPlace,
): CardDirection[] =>
{
    if (count === 0 || pool === 'joker')
    {
        return [];
    }

    const directions = directionsForPool(pool);
    const assignments: CardDirection[] = [];

    for (let i = 0; i < count; i++)
    {
        assignments.push(directions[i % directions.length]!);
    }

    return shuffle(assignments);
};

const shuffleDirectionsInPlace = <T>(items: T[]): T[] =>
{
    for (let i = items.length - 1; i > 0; i--)
    {
        const j = Math.floor(Math.random() * (i + 1));
        [ items[i], items[j] ] = [ items[j], items[i] ];
    }

    return items;
};

/** Picks a random arrow from the pool that stays on the board from this slot. */
export const randomInBoundsDirectionForPool = (
    slot: SlotPosition,
    rows: number,
    cols: number,
    pool: ArrowPool,
): CardDirection =>
{
    const poolDirections = pool === 'diagonal' ? DIAGONAL_DIRECTIONS : ORTHOGONAL_DIRECTIONS;
    const valid = getInBoundsDirections(slot, rows, cols)
        .filter((direction) => poolDirections.includes(direction));

    if (valid.length === 0)
    {
        return poolDirections[0] ?? 'right';
    }

    return valid[Math.floor(Math.random() * valid.length)];
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

/** Slot reached after moving `distance` steps in one direction (skips intermediate tiles). */
export const getSlotAtStepDistance = (
    from: SlotPosition,
    direction: CardDirection,
    rows: number,
    cols: number,
    distance: number,
): SlotPosition | null =>
{
    let slot: SlotPosition | null = from;

    for (let step = 0; step < distance; step++)
    {
        if (!slot)
        {
            return null;
        }

        slot = getNextSlot(slot, direction, rows, cols);
    }

    return slot;
};

export const getInBoundsDirectionsAtDistance = (
    slot: SlotPosition,
    rows: number,
    cols: number,
    distance: number,
): CardDirection[] =>
    CARD_DIRECTIONS.filter((direction) =>
        getSlotAtStepDistance(slot, direction, rows, cols, distance) !== null,
    );
