import type { SlotPosition } from './types';
import { random, randomInt } from '../../random/rng';

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

export const oppositeDirection = (direction: CardDirection): CardDirection =>
{
    switch (direction)
    {
        case 'up': return 'down';
        case 'down': return 'up';
        case 'left': return 'right';
        case 'right': return 'left';
        case 'up-left': return 'down-right';
        case 'up-right': return 'down-left';
        case 'down-left': return 'up-right';
        case 'down-right': return 'up-left';
    }
};

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
    CARD_DIRECTIONS[randomInt(CARD_DIRECTIONS.length)]!;

export const randomDirectionForPool = (pool: ArrowPool): CardDirection =>
{
    if (pool === 'joker')
    {
        return JOKER_PLACEHOLDER_ARROW;
    }

    const directions = pool === 'diagonal' ? DIAGONAL_DIRECTIONS : ORTHOGONAL_DIRECTIONS;

    return directions[randomInt(directions.length)]!;
};

/** Two distinct orthogonal directions for loop cards (continue + loop-back). */
export const randomOrthogonalPair = (
    continueArrow?: CardDirection,
): { arrow: CardDirection; loopArrow: CardDirection } =>
{
    const shuffled = [ ...ORTHOGONAL_DIRECTIONS ];

    for (let i = shuffled.length - 1; i > 0; i--)
    {
        const j = Math.floor(random() * (i + 1));
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

export const getDirectionsForPool = (pool: ArrowPool): readonly CardDirection[] =>
{
    if (pool === 'joker')
    {
        return [];
    }

    return pool === 'diagonal' ? DIAGONAL_DIRECTIONS : ORTHOGONAL_DIRECTIONS;
};

/**
 * Right-first order for pickers and previews — chains start on the left column
 * and need to travel across the board.
 */
export const FORWARD_ORTHOGONAL_DIRECTIONS: readonly CardDirection[] = [
    'right',
    'up',
    'down',
    'left',
];

export const FORWARD_DIAGONAL_DIRECTIONS: readonly CardDirection[] = [
    'up-right',
    'down-right',
    'up-left',
    'down-left',
];

export const getForwardDirectionsForPool = (pool: ArrowPool): readonly CardDirection[] =>
{
    if (pool === 'joker')
    {
        return [];
    }

    return pool === 'diagonal' ? FORWARD_DIAGONAL_DIRECTIONS : FORWARD_ORTHOGONAL_DIRECTIONS;
};

/**
 * Right-biased cycle so starter decks have more forward arrows than left turns.
 * Orthogonal: 4 right / 2 up / 2 down / 1 left.
 * Diagonal: 2 up-right / 2 down-right / 1 up-left / 1 down-left.
 */
const FORWARD_ORTHOGONAL_CYCLE: readonly CardDirection[] = [
    'right', 'up', 'right', 'down', 'right', 'up', 'right', 'down', 'left',
];

const FORWARD_DIAGONAL_CYCLE: readonly CardDirection[] = [
    'up-right', 'down-right', 'up-right', 'down-right', 'up-left', 'down-left',
];

export const arrowPoolLabel = (pool: ArrowPool): string =>
{
    switch (pool)
    {
        case 'orthogonal':
            return 'Right, up, down, or left';
        case 'diagonal':
            return 'Diagonal';
        case 'joker':
            return 'Any direction in battle';
    }
};

export const formatDirectionLabel = (direction: CardDirection): string =>
    direction.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join('-');

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

    const directions = getDirectionsForPool(pool);
    const assignments: CardDirection[] = [];

    for (let i = 0; i < count; i++)
    {
        assignments.push(directions[i % directions.length]!);
    }

    return shuffle(assignments);
};

/** Right-weighted direction list for starter decks (then shuffled). */
export const buildForwardBiasedDirectionsForPool = (
    pool: ArrowPool,
    count: number,
    shuffle: <T>(items: T[]) => T[] = shuffleDirectionsInPlace,
): CardDirection[] =>
{
    if (count === 0 || pool === 'joker')
    {
        return [];
    }

    const cycle = pool === 'diagonal' ? FORWARD_DIAGONAL_CYCLE : FORWARD_ORTHOGONAL_CYCLE;
    const assignments: CardDirection[] = [];

    for (let i = 0; i < count; i++)
    {
        assignments.push(cycle[i % cycle.length]!);
    }

    return shuffle(assignments);
};

const shuffleDirectionsInPlace = <T>(items: T[]): T[] =>
{
    for (let i = items.length - 1; i > 0; i--)
    {
        const j = Math.floor(random() * (i + 1));
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

    return valid[randomInt(valid.length)]!;
};

export const getInBoundsDirections = (
    slot: SlotPosition,
    rows: number,
    cols: number,
): CardDirection[] =>
    CARD_DIRECTIONS.filter((direction) => getNextSlot(slot, direction, rows, cols) !== null);

/**
 * The two forward-diagonal directions a "corner turn" card can hook into, given
 * its orthogonal arrow. Order is fixed so routing stays seed-deterministic.
 * Non-orthogonal arrows have no corner targets.
 */
const CORNER_TARGETS: Record<CardDirection, readonly CardDirection[]> = {
    up: [ 'up-left', 'up-right' ],
    down: [ 'down-left', 'down-right' ],
    left: [ 'up-left', 'down-left' ],
    right: [ 'up-right', 'down-right' ],
    'up-left': [],
    'up-right': [],
    'down-left': [],
    'down-right': [],
};

export const cornerTargetDirections = (
    direction: CardDirection,
): readonly CardDirection[] =>
    CORNER_TARGETS[direction];

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

/** Wraps out-of-bounds coordinates to the opposite board edge (toroidal routing). */
export const wrapSlot = (
    { row, col }: SlotPosition,
    rows: number,
    cols: number,
): SlotPosition => ({
    row: ((row % rows) + rows) % rows,
    col: ((col % cols) + cols) % cols,
});

/** Next slot when the chain wraps around board edges instead of stopping. */
export const getNextSlotWithWrap = (
    slot: SlotPosition,
    direction: CardDirection,
    rows: number,
    cols: number,
): SlotPosition =>
{
    const offset = OFFSETS[direction];

    return wrapSlot(
        { row: slot.row + offset.row, col: slot.col + offset.col },
        rows,
        cols,
    );
};

/** Slot reached after moving `distance` steps with edge wrap (skips intermediate tiles). */
export const getSlotAtStepDistanceWithWrap = (
    from: SlotPosition,
    direction: CardDirection,
    rows: number,
    cols: number,
    distance: number,
): SlotPosition =>
{
    let slot = from;

    for (let step = 0; step < distance; step++)
    {
        slot = getNextSlotWithWrap(slot, direction, rows, cols);
    }

    return slot;
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
