import { describe, expect, it, beforeEach } from 'vitest';
import { GRID_CONFIG } from '../../config/gridConfig';
import { BoardModel, createEmptyBoard } from '../domain/BoardModel';
import { createCardInstance, resetCardInstanceCounter } from '../domain/createCardInstance';
import { buildChainTickBeats } from './chainTickBeats';

describe('buildChainTickBeats', () =>
{
    beforeEach(() =>
    {
        resetCardInstanceCounter();
    });

    it('sums card durations along the path and marks each enemy hit beat', () =>
    {
        const board = new BoardModel(createEmptyBoard(GRID_CONFIG.rows, GRID_CONFIG.cols));

        board.placeCard({ row: 0, col: 0 }, createCardInstance('attack', 'right'));
        board.placeCard({ row: 0, col: 1 }, createCardInstance('attack', 'right'));
        board.placeCard({ row: 0, col: 2 }, createCardInstance('defend', 'left'));

        const slots = [
            { row: 0, col: 0 },
            { row: 0, col: 1 },
            { row: 0, col: 2 },
        ];
        const beats = buildChainTickBeats(board, slots, 30);

        expect(beats.map((beat) => beat.cumulativeTicks)).toEqual([ 10, 20, 32 ]);
        expect(beats.map((beat) => beat.isHitBeat)).toEqual([ false, false, true ]);
        expect(beats[2]?.hitBeatTicks).toBe(30);
    });

    it('marks every timer multiple on a long chain', () =>
    {
        const board = new BoardModel(createEmptyBoard(GRID_CONFIG.rows, GRID_CONFIG.cols));
        const slots = [];

        for (let col = 0; col < 5; col++)
        {
            board.placeCard({ row: 0, col }, createCardInstance('attack', 'right'));
            slots.push({ row: 0, col });
        }

        // 10+10+10+10+10 = 50 → hits at 30 and not a second full 60.
        const beats = buildChainTickBeats(board, slots, 30);

        expect(beats.map((beat) => beat.isHitBeat)).toEqual([
            false, false, true, false, false,
        ]);
        expect(beats[2]?.hitBeatTicks).toBe(30);
    });

    it('marks the last card when the chain is shorter than the enemy timer', () =>
    {
        const board = new BoardModel(createEmptyBoard(GRID_CONFIG.rows, GRID_CONFIG.cols));

        board.placeCard({ row: 0, col: 0 }, createCardInstance('attack', 'right'));
        board.placeCard({ row: 0, col: 1 }, createCardInstance('attack', 'right'));

        const beats = buildChainTickBeats(
            board,
            [{ row: 0, col: 0 }, { row: 0, col: 1 }],
            30,
        );

        expect(beats.map((beat) => beat.cumulativeTicks)).toEqual([ 10, 20 ]);
        expect(beats.map((beat) => beat.isHitBeat)).toEqual([ false, true ]);
        expect(beats[1]?.hitBeatTicks).toBe(30);
    });

    it('does not mark a hit beat when no enemy timing is provided', () =>
    {
        const board = new BoardModel(createEmptyBoard(GRID_CONFIG.rows, GRID_CONFIG.cols));

        board.placeCard({ row: 0, col: 0 }, createCardInstance('attack', 'right'));

        const beats = buildChainTickBeats(board, [{ row: 0, col: 0 }], null);

        expect(beats).toEqual([
            {
                slot: { row: 0, col: 0 },
                cumulativeTicks: 10,
                isHitBeat: false,
                hitBeatTicks: undefined,
            },
        ]);
    });
});
