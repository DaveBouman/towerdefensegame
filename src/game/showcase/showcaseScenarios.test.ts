import { describe, expect, it } from 'vitest';
import { planAttack } from '../cardGame/combat/AttackPipeline';
import { BoardModel, createEmptyBoard } from '../cardGame/domain/BoardModel';
import { createCardInstance } from '../cardGame/domain/createCardInstance';
import { GRID_CONFIG } from '../config/gridConfig';
import {
    SHOWCASE_BOARD_CHAIN_START,
    SHOWCASE_FULL_BOARD,
    SHOWCASE_HAND_CARDS,
} from './showcaseScenarios';

describe('showcaseScenarios', () =>
{
    it('board capture chain connects every placed card', () =>
    {
        const board = new BoardModel(createEmptyBoard(GRID_CONFIG.rows, GRID_CONFIG.cols));

        for (const spec of SHOWCASE_FULL_BOARD)
        {
            board.placeCard(
                { row: spec.row, col: spec.col },
                createCardInstance(spec.definitionId, spec.arrow, 'player', spec.loopArrow),
            );
        }

        const chain = planAttack(board, SHOWCASE_BOARD_CHAIN_START).chain;

        expect(chain.length).toBe(SHOWCASE_FULL_BOARD.length);
    });

    it('board capture includes a visible hand', () =>
    {
        expect(SHOWCASE_HAND_CARDS.length).toBeGreaterThanOrEqual(5);
    });
});
