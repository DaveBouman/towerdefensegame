import { describe, expect, it } from 'vitest';
import { GRID_CONFIG } from '../../config/gridConfig';
import { GAME_RULES, getCardDefinitionOrThrow } from '../config/cardRegistry';
import { BoardModel, createEmptyBoard } from '../domain/BoardModel';
import { createCardInstance, resetCardInstanceCounter } from '../domain/createCardInstance';
import { planActivationChain, planAttack } from './AttackPipeline';
import {
    applyAnchoredBonuses,
    isCardAnchored,
    markCardRelocated,
    markCardSettled,
} from './anchoredBonus';
import { resolveChainSteps } from './chainResolve';

describe('anchoredBonus', () =>
{
    it('rewards settled unmoved attack cards on the chain', () =>
    {
        resetCardInstanceCounter();
        const board = new BoardModel(createEmptyBoard(GRID_CONFIG.rows, GRID_CONFIG.cols));
        const attack = createCardInstance('attack', 'right');
        markCardSettled(attack);
        board.placeCard({ row: 0, col: 0 }, attack);

        const sequence = planAttack(board, { row: 0, col: 0 });
        const base = getCardDefinitionOrThrow('attack').power;

        expect(isCardAnchored(attack)).toBe(true);
        expect(sequence.chain[0]!.damage).toBe(base + GAME_RULES.anchoredBonus.attackDamage);
    });

    it('drops the bonus after a board move', () =>
    {
        resetCardInstanceCounter();
        const attack = createCardInstance('attack', 'right');
        markCardSettled(attack);
        markCardRelocated(attack);

        expect(isCardAnchored(attack)).toBe(false);

        const board = new BoardModel(createEmptyBoard(GRID_CONFIG.rows, GRID_CONFIG.cols));
        board.placeCard({ row: 0, col: 0 }, attack);
        const sequence = planAttack(board, { row: 0, col: 0 });
        const base = getCardDefinitionOrThrow('attack').power;

        expect(sequence.chain[0]!.damage).toBe(base);
    });

    it('adds anchored chip to off-chain defend cards', () =>
    {
        resetCardInstanceCounter();
        const board = new BoardModel(createEmptyBoard(GRID_CONFIG.rows, GRID_CONFIG.cols));
        const lead = createCardInstance('attack', 'right');
        const follow = createCardInstance('attack', 'left');
        const offDefend = createCardInstance('defend', 'right');
        markCardSettled(lead);
        markCardSettled(follow);
        markCardSettled(offDefend);
        board.placeCard({ row: 0, col: 0 }, lead);
        board.placeCard({ row: 0, col: 1 }, follow);
        board.placeCard({ row: 1, col: 0 }, offDefend);

        const sequence = planAttack(board, { row: 0, col: 0 });

        expect(planActivationChain(board, { row: 0, col: 0 })).toHaveLength(2);
        expect(sequence.offChainArmor).toBe(
            GAME_RULES.offChainBonus.defendArmor + GAME_RULES.anchoredBonus.defendArmor,
        );
    });

    it('does not grant bonus to unsettle test placements', () =>
    {
        const board = new BoardModel(createEmptyBoard(GRID_CONFIG.rows, GRID_CONFIG.cols));
        board.placeCard({ row: 0, col: 0 }, createCardInstance('attack', 'right'));
        const chain = resolveChainSteps(planActivationChain(board, { row: 0, col: 0 }));
        const boosted = applyAnchoredBonuses(chain);

        expect(boosted[0]!.damage).toBe(chain[0]!.damage);
    });
});
