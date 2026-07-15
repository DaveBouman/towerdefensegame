import { describe, expect, it } from 'vitest';
import { planActivationChain } from '../combat/AttackPipeline';
import { BoardModel, createEmptyBoard } from './BoardModel';
import { createCardInstance } from './createCardInstance';
import { oppositeDirection } from './cardDirections';
import { pickFieldCardArrow, reconcileFieldCardArrows } from './fieldCardArrows';

describe('fieldCardArrows', () =>
{
    it('breaks ping-pong arrows between a trap above and boost below', () =>
    {
        const board = new BoardModel(createEmptyBoard(5, 5));
        const trapSlot = { row: 0, col: 2 };
        const boostSlot = { row: 1, col: 2 };

        board.placeCard(boostSlot, createCardInstance('boost', 'up', 'field'));

        const trap = createCardInstance('hazard', 'down', 'enemy');

        board.placeCard(trapSlot, trap);
        reconcileFieldCardArrows(board, trapSlot);

        const boost = board.getCardAt(boostSlot);

        expect(trap.arrow).toBe('down');
        expect(boost?.arrow).not.toBe('up');
    });

    it('breaks ping-pong arrows when the boost is placed after the trap', () =>
    {
        const board = new BoardModel(createEmptyBoard(5, 5));
        const trapSlot = { row: 0, col: 2 };
        const boostSlot = { row: 1, col: 2 };

        board.placeCard(trapSlot, createCardInstance('hazard', 'down', 'enemy'));

        const boost = createCardInstance('boost', 'up', 'field');

        board.placeCard(boostSlot, boost);
        reconcileFieldCardArrows(board, boostSlot);

        expect(board.getCardAt(trapSlot)?.arrow).toBe('down');
        expect(boost.arrow).not.toBe('up');
    });

    it('prefers pointing toward an adjacent ambient card when picking an arrow', () =>
    {
        const board = new BoardModel(createEmptyBoard(5, 5));
        const trapSlot = { row: 0, col: 2 };
        const boostSlot = { row: 1, col: 2 };

        board.placeCard(boostSlot, createCardInstance('boost', 'right', 'field'));

        const arrow = pickFieldCardArrow(board, trapSlot, 'orthogonal');

        expect(arrow).toBe('down');
        expect(oppositeDirection(arrow)).not.toBe(board.getCardAt(boostSlot)?.arrow);
    });

    it('allows a chain to pass through a trap into a boost below it', () =>
    {
        const board = new BoardModel(createEmptyBoard(5, 5));

        board.placeCard({ row: 0, col: 0 }, createCardInstance('attack', 'right'));
        board.placeCard({ row: 0, col: 1 }, createCardInstance('attack', 'down'));
        board.placeCard({ row: 1, col: 1 }, createCardInstance('hazard', 'down', 'enemy'));
        board.placeCard({ row: 2, col: 1 }, createCardInstance('boost', 'right', 'field'));
        board.placeCard({ row: 2, col: 2 }, createCardInstance('attack', 'right'));

        const chain = planActivationChain(board, { row: 0, col: 0 });
        const definitionIds = chain.map((step) => step.definitionId);

        expect(definitionIds).toContain('hazard');
        expect(definitionIds).toContain('boost');
        expect(definitionIds.indexOf('hazard')).toBeLessThan(definitionIds.indexOf('boost'));
    });
});
