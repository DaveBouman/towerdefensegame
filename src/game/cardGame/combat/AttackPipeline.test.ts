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

        board.placeCard({ row: 0, col: 0 }, createCardInstance('attack', 'right'));
        board.placeCard({ row: 0, col: 1 }, createCardInstance('attack', 'down'));
        board.placeCard({ row: 1, col: 1 }, createCardInstance('defend', 'right'));
        board.placeCard({ row: 1, col: 0 }, createCardInstance('attack', 'up'));

        const chain = planActivationChain(board, { row: 0, col: 0 });

        expect(chain.map((step) => step.slot)).toEqual([
            { row: 0, col: 0 },
            { row: 0, col: 1 },
            { row: 1, col: 1 },
        ]);
        expect(chain[2].armor).toBe(3);
    });

    it('follows diagonal arrows', () =>
    {
        const board = new BoardModel(createEmptyBoard(GRID_CONFIG.rows, GRID_CONFIG.cols));

        board.placeCard({ row: 0, col: 0 }, createCardInstance('attack', 'down-right'));
        board.placeCard({ row: 1, col: 1 }, createCardInstance('attack', 'left'));

        const chain = planActivationChain(board, { row: 0, col: 0 });

        expect(chain.map((step) => step.slot)).toEqual([
            { row: 0, col: 0 },
            { row: 1, col: 1 },
        ]);
        expect(chain[1].arrow).toBe('left');
    });

    it('stops when the arrow points to an empty cell', () =>
    {
        const board = new BoardModel(createEmptyBoard(GRID_CONFIG.rows, GRID_CONFIG.cols));

        board.placeCard({ row: 0, col: 2 }, createCardInstance('attack', 'right'));

        const chain = planActivationChain(board, { row: 0, col: 2 });

        expect(chain).toHaveLength(1);
    });

    it('only starts the chain from the chosen start slot', () =>
    {
        const board = new BoardModel(createEmptyBoard(GRID_CONFIG.rows, GRID_CONFIG.cols));

        board.placeCard({ row: 1, col: 0 }, createCardInstance('attack', 'right'));
        board.placeCard({ row: 0, col: 0 }, createCardInstance('attack', 'right'));

        const fromTop = planActivationChain(board, { row: 0, col: 0 });
        const fromMiddle = planActivationChain(board, { row: 1, col: 0 });

        expect(fromTop.map((step) => step.slot)).toEqual([ { row: 0, col: 0 } ]);
        expect(fromMiddle.map((step) => step.slot)).toEqual([ { row: 1, col: 0 } ]);
    });

    it('activates strike twice when the chain revisits it', () =>
    {
        const board = new BoardModel(createEmptyBoard(GRID_CONFIG.rows, GRID_CONFIG.cols));

        board.placeCard({ row: 0, col: 0 }, createCardInstance('attack-special', 'right'));
        board.placeCard({ row: 0, col: 1 }, createCardInstance('attack', 'left'));

        const chain = planActivationChain(board, { row: 0, col: 0 });

        expect(chain).toHaveLength(3);
        expect(chain[0].definitionId).toBe('attack-special');
        expect(chain[2].definitionId).toBe('attack-special');
        expect(chain[0].slot).toEqual(chain[2].slot);
        expect(planAttack(board, { row: 0, col: 0 }).totalDamage).toBe(19);
    });

    it('stops revisiting regular attack cards after the first activation', () =>
    {
        const board = new BoardModel(createEmptyBoard(GRID_CONFIG.rows, GRID_CONFIG.cols));

        board.placeCard({ row: 0, col: 0 }, createCardInstance('attack', 'right'));
        board.placeCard({ row: 0, col: 1 }, createCardInstance('attack', 'left'));

        const chain = planActivationChain(board, { row: 0, col: 0 });

        expect(chain).toHaveLength(2);
    });

    it('plans damage from attack cards in the chain', () =>
    {
        const board = new BoardModel(createEmptyBoard(GRID_CONFIG.rows, GRID_CONFIG.cols));

        board.placeCard({ row: 0, col: 0 }, createCardInstance('attack', 'right'));
        board.placeCard({ row: 0, col: 1 }, createCardInstance('attack', 'left'));

        const sequence = planAttack(board);

        expect(sequence.steps).toHaveLength(2);
        expect(sequence.totalDamage).toBe(10);
        expect(sequence.stepMs).toBe(1500);
        expect(sequence.durationMs).toBe(3000);
    });
});
