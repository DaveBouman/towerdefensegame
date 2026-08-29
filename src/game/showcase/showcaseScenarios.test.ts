import { describe, expect, it } from 'vitest';
import { planAttack } from '../cardGame/combat/AttackPipeline';
import { BoardModel, createEmptyBoard } from '../cardGame/domain/BoardModel';
import { createCardInstance } from '../cardGame/domain/createCardInstance';
import { GRID_CONFIG } from '../config/gridConfig';
import {
    SHOWCASE_BOARD_CHAIN_IDS,
    SHOWCASE_BOARD_CHAIN_START,
    SHOWCASE_CARD_ART_BOARD,
    SHOWCASE_CARD_ART_HAND,
    SHOWCASE_FULL_BOARD,
    SHOWCASE_HAND_CARDS,
    parseCaptureId,
} from './showcaseScenarios';

describe('showcaseScenarios', () =>
{
    it('parses cardart capture id', () =>
    {
        expect(parseCaptureId('cardart')).toBe('cardart');
    });

    it('cardart board shows attack type-stack and rad→defend trail', () =>
    {
        expect(SHOWCASE_CARD_ART_BOARD.slice(0, 3).every((spec) =>
            spec.definitionId.startsWith('attack'))).toBe(true);
        expect(SHOWCASE_CARD_ART_BOARD.some((spec) => spec.definitionId === 'poison')).toBe(true);
        expect(SHOWCASE_CARD_ART_BOARD.filter((spec) => spec.definitionId === 'defend').length)
            .toBeGreaterThanOrEqual(2);
    });
    it('board capture walks the showcase route with leaps, corners, and combos', () =>
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
        const chainIds = chain.map((step) => step.definitionId);
        const occupiedRows = new Set(SHOWCASE_FULL_BOARD.map((spec) => spec.row));

        expect(chainIds).toEqual([ ...SHOWCASE_BOARD_CHAIN_IDS ]);
        expect(occupiedRows.size).toBeGreaterThanOrEqual(4);
        expect(SHOWCASE_FULL_BOARD.length).toBeLessThan(GRID_CONFIG.rows * GRID_CONFIG.cols);
        expect(chainIds).toContain('skewer');
        expect(chainIds).toContain('attack-leap');
        expect(chainIds).toContain('lacerate');
        expect(chainIds).toContain('phase-relay');
        expect(chainIds).toContain('white-hot');
        expect(chainIds).toContain('scorch');
        expect(chainIds).toContain('bramble');
        expect(chainIds).toContain('shiv');
        expect(chainIds).toContain('corner-strike');
        expect(chainIds).toContain('switchback');
        expect(chainIds.filter((id) => id === 'attack-special')).toHaveLength(2);

        const diagonalArrows = SHOWCASE_FULL_BOARD.filter((spec) =>
            spec.arrow === 'up-left'
            || spec.arrow === 'up-right'
            || spec.arrow === 'down-left'
            || spec.arrow === 'down-right');
        expect(diagonalArrows.length).toBeGreaterThanOrEqual(6);
    });

    it('board capture includes a visible hand', () =>
    {
        expect(SHOWCASE_HAND_CARDS.length).toBeGreaterThanOrEqual(5);
    });
});
