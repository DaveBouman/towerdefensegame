import { describe, expect, it, beforeEach } from 'vitest';
import { GRID_CONFIG } from '../../config/gridConfig';
import { planActivationChain, planAttack } from './AttackPipeline';
import { BoardModel, createEmptyBoard } from '../domain/BoardModel';
import { createCardInstance, resetCardInstanceCounter } from '../domain/createCardInstance';

describe('AttackPipeline', () =>
{
    beforeEach(() =>
    {
        resetCardInstanceCounter();
    });

    it('follows card arrows instead of left-to-right order', () =>
    {
        const board = new BoardModel(createEmptyBoard(GRID_CONFIG.rows, GRID_CONFIG.cols));

        board.placeCard({ row: 0, col: 0 }, createCardInstance('atk-right'));
        board.placeCard({ row: 0, col: 1 }, createCardInstance('atk-down'));
        board.placeCard({ row: 1, col: 1 }, createCardInstance('def-right'));
        board.placeCard({ row: 1, col: 0 }, createCardInstance('atk-up'));

        const chain = planActivationChain(board, { row: 0, col: 0 });

        expect(chain.map((step) => step.slot)).toEqual([
            { row: 0, col: 0 },
            { row: 0, col: 1 },
            { row: 1, col: 1 },
        ]);
        expect(chain[2].armor).toBe(3);
    });

    it('stops when the arrow points to an empty cell', () =>
    {
        const board = new BoardModel(createEmptyBoard(GRID_CONFIG.rows, GRID_CONFIG.cols));

        board.placeCard({ row: 0, col: 2 }, createCardInstance('atk-right'));

        const chain = planActivationChain(board, { row: 0, col: 2 });

        expect(chain).toHaveLength(1);
    });

    it('plans damage from attack cards in the chain', () =>
    {
        const board = new BoardModel(createEmptyBoard(GRID_CONFIG.rows, GRID_CONFIG.cols));

        board.placeCard({ row: 0, col: 0 }, createCardInstance('atk-right'));
        board.placeCard({ row: 0, col: 1 }, createCardInstance('atk-left'));

        const sequence = planAttack(board);

        expect(sequence.steps).toHaveLength(2);
        expect(sequence.totalDamage).toBe(10);
        expect(sequence.durationMs).toBeGreaterThan(0);
    });
});
