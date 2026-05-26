import type { GridPosition } from '../grid/types';

export const tileKey = ({ col, row }: GridPosition): string => `${col},${row}`;

export const parseTileKey = (key: string): GridPosition =>
{
    const [ col, row ] = key.split(',').map(Number);

    return { col, row };
};
