import type { GridPosition } from './types';

export const gridDistance = (a: GridPosition, b: GridPosition): number =>
{
    const dx = a.col - b.col;
    const dy = a.row - b.row;

    return Math.sqrt(dx * dx + dy * dy);
};
