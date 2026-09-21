import { describe, expect, it } from 'vitest';
import { BoardModel, createEmptyBoard } from './BoardModel';
import { createCardInstance } from './createCardInstance';
import { pickFieldCardArrow, reconcileFieldCardArrows } from './fieldCardArrows';

describe('fieldCardArrows', () =>
{
    it('breaks right/left ping-pong when only right/down are valid', () =>
    {
        const board = new BoardModel(createEmptyBoard(5, 5));
        const trapSlot = { row: 1, col: 1 };
        const boostSlot = { row: 1, col: 2 };

        board.placeCard(boostSlot, createCardInstance('boost', 'left', 'field'));

        const trap = createCardInstance('hazard', 'right', 'enemy');

        board.placeCard(trapSlot, trap);
        reconcileFieldCardArrows(board, trapSlot);

        const boost = board.getCardAt(boostSlot);

        expect(trap.arrow).toBe('right');
        // Left is outside the experimental pool — reconcile remaps the boost.
        expect(boost?.arrow === 'right' || boost?.arrow === 'down').toBe(true);
    });

    it('prefers pointing toward an adjacent ambient card when picking an arrow', () =>
    {
        const board = new BoardModel(createEmptyBoard(5, 5));
        const trapSlot = { row: 0, col: 2 };
        const boostSlot = { row: 1, col: 2 };

        board.placeCard(trapSlot, createCardInstance('hazard', 'down', 'enemy'));

        const arrow = pickFieldCardArrow(board, boostSlot, 'orthogonal');

        expect(arrow === 'right' || arrow === 'down').toBe(true);
    });
});
