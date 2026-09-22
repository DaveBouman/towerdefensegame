import type { SlotPosition } from '../cardGame/domain/types';

/** Clockwise edge ring on the 5×5 (16 tiles) — Loop Hero style road. */
export const EDGE_RING_ROAD: readonly SlotPosition[] = (() =>
{
    const tiles: SlotPosition[] = [];

    for (let col = 0; col < 5; col += 1)
    {
        tiles.push({ row: 0, col });
    }

    for (let row = 1; row < 5; row += 1)
    {
        tiles.push({ row, col: 4 });
    }

    for (let col = 3; col >= 0; col -= 1)
    {
        tiles.push({ row: 4, col });
    }

    for (let row = 3; row >= 1; row -= 1)
    {
        tiles.push({ row, col: 0 });
    }

    return tiles;
})();

/** Inner diamond / figure path through mid-board (12 tiles). */
export const CROSS_ROAD: readonly SlotPosition[] = [
    { row: 0, col: 2 },
    { row: 1, col: 2 },
    { row: 2, col: 2 },
    { row: 2, col: 1 },
    { row: 2, col: 0 },
    { row: 3, col: 0 },
    { row: 4, col: 0 },
    { row: 4, col: 1 },
    { row: 4, col: 2 },
    { row: 4, col: 3 },
    { row: 4, col: 4 },
    { row: 3, col: 4 },
];

/** Boustrophedon fill of the first N tiles (Backpack-dense road). */
export const snakeRoad = (length: number): SlotPosition[] =>
{
    const tiles: SlotPosition[] = [];

    for (let index = 0; index < length; index += 1)
    {
        const row = Math.floor(index / 5);
        const colInRow = index % 5;
        const goingRight = row % 2 === 0;
        const col = goingRight ? colInRow : 4 - colInRow;

        tiles.push({ row, col });
    }

    return tiles;
};
