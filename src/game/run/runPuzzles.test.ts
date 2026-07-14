import { describe, expect, it } from 'vitest';
import { GRID_CONFIG } from '../config/gridConfig';
import { planAttack } from '../cardGame/combat/AttackPipeline';
import { BoardModel, createEmptyBoard } from '../cardGame/domain/BoardModel';
import { createCardInstance } from '../cardGame/domain/createCardInstance';
import {
    computePuzzleDamageDealt,
    getRunPuzzle,
    rollPuzzleId,
    RUN_PUZZLES,
} from './runPuzzles';
import { seedScope } from '../random/rng';

const damageAt = (
    placements: readonly { row: number; col: number; definitionId: string; arrow?: 'right' | 'left' | 'up' | 'down'; loopArrow?: 'right' | 'left' | 'up' | 'down' }[],
    startRow = 0,
): number =>
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

    return computePuzzleDamageDealt(planAttack(board, { row: startRow, col: 0 }));
};

describe('runPuzzles', () =>
{
    it('loads puzzle definitions', () =>
    {
        expect(getRunPuzzle('boost-basics').cards).toHaveLength(3);
        expect(Object.keys(RUN_PUZZLES).length).toBeGreaterThanOrEqual(5);
    });

    it('rolls puzzles deterministically per seed', () =>
    {
        seedScope('puzzle-seed', 'event:n0-0:puzzle');
        const first = rollPuzzleId();

        seedScope('puzzle-seed', 'event:n0-0:puzzle');
        const second = rollPuzzleId();

        expect(first).toBe(second);
        expect(getRunPuzzle(first).id).toBe(first);
    });

    it('boost-basics is solvable at its target', () =>
    {
        const puzzle = getRunPuzzle('boost-basics');
        const damage = damageAt([
            { row: 0, col: 0, definitionId: 'boost', arrow: 'right' },
            { row: 0, col: 1, definitionId: 'attack', arrow: 'right' },
            { row: 0, col: 2, definitionId: 'attack', arrow: 'right' },
        ]);

        expect(damage).toBeGreaterThanOrEqual(puzzle.damageTarget);
    });

    it('triple-strike is solvable at its target', () =>
    {
        const puzzle = getRunPuzzle('triple-strike');
        const damage = damageAt([
            { row: 0, col: 0, definitionId: 'attack', arrow: 'right' },
            { row: 0, col: 1, definitionId: 'attack', arrow: 'right' },
            { row: 0, col: 2, definitionId: 'attack', arrow: 'right' },
        ]);

        expect(damage).toBeGreaterThanOrEqual(puzzle.damageTarget);
    });

    it('looping-strike is solvable at its target', () =>
    {
        const puzzle = getRunPuzzle('looping-strike');
        const damage = damageAt([
            { row: 0, col: 0, definitionId: 'attack-special', arrow: 'right' },
            { row: 0, col: 1, definitionId: 'attack', arrow: 'left' },
        ]);

        expect(damage).toBeGreaterThanOrEqual(puzzle.damageTarget);
    });

    it('fire-alternation is solvable at its target', () =>
    {
        const puzzle = getRunPuzzle('fire-alternation');
        const damage = damageAt([
            { row: 0, col: 0, definitionId: 'fire', arrow: 'right' },
            { row: 0, col: 1, definitionId: 'attack', arrow: 'right' },
            { row: 0, col: 2, definitionId: 'defend', arrow: 'right' },
            { row: 0, col: 3, definitionId: 'attack', arrow: 'right' },
        ]);

        expect(damage).toBeGreaterThanOrEqual(puzzle.damageTarget);
    });

    it('loop-lesson is solvable at its target', () =>
    {
        const puzzle = getRunPuzzle('loop-lesson');
        const damage = damageAt([
            { row: 0, col: 0, definitionId: 'attack', arrow: 'right' },
            { row: 0, col: 1, definitionId: 'loop-reset', arrow: 'right', loopArrow: 'left' },
        ]);

        expect(damage).toBeGreaterThanOrEqual(puzzle.damageTarget);
    });

    it('rupture-bleed is solvable at its target', () =>
    {
        const puzzle = getRunPuzzle('rupture-bleed');
        const damage = damageAt([
            { row: 0, col: 0, definitionId: 'rupture', arrow: 'right' },
            { row: 0, col: 1, definitionId: 'attack', arrow: 'right' },
            { row: 0, col: 2, definitionId: 'attack', arrow: 'right' },
            { row: 0, col: 3, definitionId: 'attack', arrow: 'right' },
        ]);

        expect(damage).toBeGreaterThanOrEqual(puzzle.damageTarget);
    });
});
