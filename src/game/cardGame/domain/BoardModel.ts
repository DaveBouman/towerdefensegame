import type { BoardGrid, CardInstance, SlotPosition } from './types';

export const createEmptyBoard = (rows: number, cols: number): BoardGrid =>
    Array.from({ length: rows }, () => Array.from({ length: cols }, () => null));

export class BoardModel
{
    constructor (readonly grid: BoardGrid) {}

    get rows (): number
    {
        return this.grid.length;
    }

    get cols (): number
    {
        return this.grid[0]?.length ?? 0;
    }

    getCardAt ({ row, col }: SlotPosition): CardInstance | null
    {
        return this.grid[row]?.[col] ?? null;
    }

    isEmpty ({ row, col }: SlotPosition): boolean
    {
        return this.getCardAt({ row, col }) === null;
    }

    placeCard (slot: SlotPosition, card: CardInstance): boolean
    {
        if (!this.isInBounds(slot) || !this.isEmpty(slot))
        {
            return false;
        }

        this.grid[slot.row][slot.col] = card;

        return true;
    }

    /** Row-major order: top → bottom, left → right. */
    *slotsInOrder (): Generator<SlotPosition>
    {
        for (let row = 0; row < this.rows; row++)
        {
            for (let col = 0; col < this.cols; col++)
            {
                yield { row, col };
            }
        }
    }

    private isInBounds ({ row, col }: SlotPosition): boolean
    {
        return row >= 0 && row < this.rows && col >= 0 && col < this.cols;
    }
}
