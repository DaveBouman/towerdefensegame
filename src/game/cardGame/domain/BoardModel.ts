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

    removeCard (slot: SlotPosition): CardInstance | null
    {
        if (!this.isInBounds(slot))
        {
            return null;
        }

        const card = this.getCardAt(slot);

        if (!card)
        {
            return null;
        }

        this.grid[slot.row][slot.col] = null;

        return card;
    }

    moveCard (from: SlotPosition, to: SlotPosition): boolean
    {
        if (!this.isInBounds(from) || !this.isInBounds(to) || !this.isEmpty(to))
        {
            return false;
        }

        const card = this.removeCard(from);

        if (!card)
        {
            return false;
        }

        this.grid[to.row][to.col] = card;

        return true;
    }

    swapCards (a: SlotPosition, b: SlotPosition): boolean
    {
        if (!this.isInBounds(a) || !this.isInBounds(b))
        {
            return false;
        }

        if (a.row === b.row && a.col === b.col)
        {
            return false;
        }

        const cardA = this.getCardAt(a);

        if (!cardA)
        {
            return false;
        }

        const cardB = this.getCardAt(b);

        this.grid[a.row][a.col] = cardB;
        this.grid[b.row][b.col] = cardA;

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

    clear (): void
    {
        for (let row = 0; row < this.rows; row++)
        {
            for (let col = 0; col < this.cols; col++)
            {
                this.grid[row][col] = null;
            }
        }
    }

    private isInBounds ({ row, col }: SlotPosition): boolean
    {
        return row >= 0 && row < this.rows && col >= 0 && col < this.cols;
    }
}
