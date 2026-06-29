import { describe, expect, it, beforeEach } from 'vitest';
import { GRID_CONFIG } from '../../config/gridConfig';
import { computeRowArmor } from './computeBoardArmor';
import { BoardModel, createEmptyBoard } from '../domain/BoardModel';
import { createCardInstance, resetCardInstanceCounter } from '../domain/createCardInstance';

describe('computeRowArmor', () =>
{
    beforeEach(() =>
    {
        resetCardInstanceCounter();
    });

    it('sums armor from defend cards in the given row only', () =>
    {
        const board = new BoardModel(createEmptyBoard(GRID_CONFIG.rows, GRID_CONFIG.cols));

        board.placeCard({ row: 0, col: 0 }, createCardInstance('attack', 'right'));
        board.placeCard({ row: 1, col: 1 }, createCardInstance('defend', 'down'));
        board.placeCard({ row: 2, col: 2 }, createCardInstance('defend', 'up'));

        expect(computeRowArmor(board, 0)).toBe(0);
        expect(computeRowArmor(board, 1)).toBe(3);
        expect(computeRowArmor(board, 2)).toBe(3);
    });
});
