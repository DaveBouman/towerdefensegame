import { describe, expect, it, beforeEach } from 'vitest';
import { BoardModel, createEmptyBoard } from './BoardModel';
import { createCardInstance, resetCardInstanceCounter } from './createCardInstance';

describe('BoardModel', () =>
{
    beforeEach(() =>
    {
        resetCardInstanceCounter();
    });

    it('removes, moves, and swaps cards on the board', () =>
    {
        const board = new BoardModel(createEmptyBoard(3, 3));
        const attack = createCardInstance('attack', 'right');
        const defend = createCardInstance('defend', 'down');

        board.placeCard({ row: 0, col: 0 }, attack);
        board.placeCard({ row: 1, col: 1 }, defend);

        expect(board.removeCard({ row: 0, col: 0 })?.instanceId).toBe(attack.instanceId);
        expect(board.isEmpty({ row: 0, col: 0 })).toBe(true);

        expect(board.moveCard({ row: 1, col: 1 }, { row: 2, col: 2 })).toBe(true);
        expect(board.getCardAt({ row: 2, col: 2 })?.instanceId).toBe(defend.instanceId);

        board.placeCard({ row: 0, col: 0 }, attack);
        expect(board.swapCards({ row: 0, col: 0 }, { row: 2, col: 2 })).toBe(true);
        expect(board.getCardAt({ row: 0, col: 0 })?.instanceId).toBe(defend.instanceId);
        expect(board.getCardAt({ row: 2, col: 2 })?.instanceId).toBe(attack.instanceId);
    });
});
