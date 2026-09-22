import { describe, expect, it } from 'vitest';
import { GRID_CONFIG } from '../config/gridConfig';
import { planAttack } from '../cardGame/combat/AttackPipeline';
import { BoardModel, createEmptyBoard } from '../cardGame/domain/BoardModel';
import { createCardInstance } from '../cardGame/domain/createCardInstance';
import type { CardDirection } from '../cardGame/domain/cardDirections';
import {
    computePuzzleDamageDealt,
    damageTargetFromWin,
    EDGE_RING_ROAD,
    evaluatePuzzleWin,
    getRunPuzzle,
    listGalleryPuzzles,
    rollPuzzleId,
    RUN_PUZZLES,
    snakeRoad,
} from './runPuzzles';
import { seedScope } from '../random/rng';

const sequenceAt = (
    placements: readonly {
        row: number;
        col: number;
        definitionId: string;
        arrow?: CardDirection;
        loopArrow?: CardDirection;
    }[],
    start: { row: number; col: number } = { row: 0, col: 0 },
) =>
{
    const board = new BoardModel(createEmptyBoard(GRID_CONFIG.rows, GRID_CONFIG.cols));

    for (const placement of placements)
    {
        board.placeCard(
            { row: placement.row, col: placement.col },
            createCardInstance(
                placement.definitionId,
                placement.arrow,
                'player',
                placement.loopArrow,
            ),
        );
    }

    return planAttack(board, start);
};

const packAlongRoad = (
    road: readonly { row: number; col: number }[],
    cards: readonly { definitionId: string }[],
): { row: number; col: number; definitionId: string; arrow: CardDirection }[] =>
    road.map((slot, index) =>
    {
        const next = road[index + 1];
        let arrow: CardDirection = 'right';

        if (next)
        {
            if (next.row > slot.row)
            {
                arrow = 'down';
            }
            else if (next.row < slot.row)
            {
                arrow = 'up';
            }
            else if (next.col < slot.col)
            {
                arrow = 'left';
            }
            else
            {
                arrow = 'right';
            }
        }

        return {
            row: slot.row,
            col: slot.col,
            definitionId: cards[index % cards.length]!.definitionId,
            arrow,
        };
    });

describe('runPuzzles', () =>
{
    it('loads puzzle definitions', () =>
    {
        expect(getRunPuzzle('boost-basics').cards).toHaveLength(3);
        expect(Object.keys(RUN_PUZZLES).length).toBeGreaterThanOrEqual(10);
    });

    it('gallery lists roads with painted paths', () =>
    {
        const gallery = listGalleryPuzzles();

        expect(gallery.length).toBeGreaterThanOrEqual(5);
        expect(gallery.every((puzzle) => puzzle.gallery === true)).toBe(true);
        expect(gallery.every((puzzle) => (puzzle.road?.length ?? 0) >= 10)).toBe(true);
        expect(gallery.some((puzzle) => puzzle.id === 'boost-basics')).toBe(false);
    });

    it('rolls event puzzles deterministically per seed', () =>
    {
        seedScope('puzzle-seed', 'event:n0-0:puzzle');
        const first = rollPuzzleId();

        seedScope('puzzle-seed', 'event:n0-0:puzzle');
        const second = rollPuzzleId();

        expect(first).toBe(second);
        expect(getRunPuzzle(first).id).toBe(first);
    });

    it('boost-basics is solvable at its damage win', () =>
    {
        const puzzle = getRunPuzzle('boost-basics');
        const damage = computePuzzleDamageDealt(sequenceAt([
            { row: 0, col: 0, definitionId: 'boost', arrow: 'right' },
            { row: 0, col: 1, definitionId: 'attack', arrow: 'right' },
            { row: 0, col: 2, definitionId: 'attack', arrow: 'right' },
        ]));

        expect(damage).toBeGreaterThanOrEqual(damageTargetFromWin(puzzle.win));
    });

    it('ring-road clears by walking the edge ring', () =>
    {
        const puzzle = getRunPuzzle('ring-road');
        const sequence = sequenceAt(packAlongRoad(EDGE_RING_ROAD, puzzle.cards));

        expect(evaluatePuzzleWin(puzzle.win, sequence).success).toBe(true);
    });

    it('full-pack clears when the kit fires on the snake road', () =>
    {
        const puzzle = getRunPuzzle('full-pack');
        const road = snakeRoad(puzzle.cards.length);
        const sequence = sequenceAt(packAlongRoad(road, puzzle.cards));

        expect(evaluatePuzzleWin(puzzle.win, sequence).success).toBe(true);
    });

    it('camp-lattice clears useAllCards on its road', () =>
    {
        const puzzle = getRunPuzzle('camp-lattice');
        const road = snakeRoad(puzzle.cards.length);
        const sequence = sequenceAt(packAlongRoad(road, puzzle.cards));

        expect(evaluatePuzzleWin(puzzle.win, sequence).success).toBe(true);
    });

    it('fill-lane visits every snake tile', () =>
    {
        const puzzle = getRunPuzzle('mile-markers');
        const road = snakeRoad(15);
        const sequence = sequenceAt(packAlongRoad(road, puzzle.cards));

        expect(evaluatePuzzleWin(puzzle.win, sequence).success).toBe(true);
    });
});
