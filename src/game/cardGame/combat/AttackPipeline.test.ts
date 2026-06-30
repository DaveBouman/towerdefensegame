import { describe, expect, it, beforeEach } from 'vitest';
import { GRID_CONFIG } from '../../config/gridConfig';
import { planActivationChain, planAttack, computeOffChainBonuses, computeHazardDamage, computeChainTypeMultipliers, buildAttackSequence, computeStreakAtIndex } from './AttackPipeline';
import { BoardModel, createEmptyBoard } from '../domain/BoardModel';
import { createCardInstance, resetCardInstanceCounter } from '../domain/createCardInstance';
import type { ActivationStep, SlotPosition } from '../domain/types';

const attackStep = (slot: SlotPosition, damage: number): ActivationStep =>
{
    const card = createCardInstance('attack', 'right');

    return {
        slot,
        card,
        definitionId: 'attack',
        behaviorId: 'attack',
        visualId: 'attack',
        arrow: 'right',
        damage,
        armor: 0,
    };
};

const jokerStep = (slot: SlotPosition): ActivationStep =>
{
    const card = createCardInstance('joker');

    return {
        slot,
        card,
        definitionId: 'joker',
        behaviorId: 'joker',
        visualId: 'joker',
        arrow: 'right',
        damage: 0,
        armor: 0,
    };
};

const boostStep = (slot: SlotPosition): ActivationStep =>
{
    const card = createCardInstance('boost', 'right', 'field');

    return {
        slot,
        card,
        definitionId: 'boost',
        behaviorId: 'boost',
        visualId: 'boost',
        arrow: 'right',
        damage: 0,
        armor: 0,
    };
};
const hazardStep = (slot: SlotPosition): ActivationStep =>
{
    const card = createCardInstance('hazard', 'right', 'enemy');

    return {
        slot,
        card,
        definitionId: 'hazard',
        behaviorId: 'hazard',
        visualId: 'hazard',
        arrow: 'right',
        damage: 0,
        armor: 0,
    };
};

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
        expect(planAttack(board, { row: 0, col: 0 }).totalDamage).toBe(20);
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

    it('stops at a joker until the player chooses a direction during attack', () =>
    {
        const board = new BoardModel(createEmptyBoard(GRID_CONFIG.rows, GRID_CONFIG.cols));

        board.placeCard({ row: 0, col: 0 }, createCardInstance('attack', 'right'));
        board.placeCard({ row: 0, col: 1 }, createCardInstance('joker'));
        board.placeCard({ row: 0, col: 2 }, createCardInstance('attack', 'left'));

        const chain = planActivationChain(board, { row: 0, col: 0 });

        expect(chain).toHaveLength(2);
        expect(chain[1].definitionId).toBe('joker');
    });

    it('grants off-chain bonuses for board cards outside the activation chain', () =>
    {
        const board = new BoardModel(createEmptyBoard(GRID_CONFIG.rows, GRID_CONFIG.cols));

        board.placeCard({ row: 0, col: 0 }, createCardInstance('attack', 'right'));
        board.placeCard({ row: 0, col: 1 }, createCardInstance('attack', 'left'));
        board.placeCard({ row: 1, col: 0 }, createCardInstance('defend', 'right'));
        board.placeCard({ row: 1, col: 1 }, createCardInstance('defend', 'left'));

        const chain = planActivationChain(board, { row: 0, col: 0 });
        const bonuses = computeOffChainBonuses(board, chain);

        expect(chain).toHaveLength(2);
        expect(bonuses).toEqual({ damage: 0, armor: 2 });
    });

    it('applies chain stacking to repeated attack behaviors', () =>
    {
        const board = new BoardModel(createEmptyBoard(GRID_CONFIG.rows, GRID_CONFIG.cols));

        board.placeCard({ row: 0, col: 0 }, createCardInstance('attack', 'right'));
        board.placeCard({ row: 0, col: 1 }, createCardInstance('attack', 'right'));
        board.placeCard({ row: 0, col: 2 }, createCardInstance('attack', 'left'));

        const sequence = planAttack(board, { row: 0, col: 0 });

        expect(computeChainTypeMultipliers(sequence.chain)).toEqual({ attack: 1.16 });
        expect(sequence.chain).toHaveLength(3);
        expect(sequence.totalDamage).toBe(16);
    });

    it('does not reset attack streak across jokers and other skills', () =>
    {
        const chain = [
            attackStep({ row: 0, col: 0 }, 5),
            jokerStep({ row: 0, col: 1 }),
            attackStep({ row: 0, col: 2 }, 5),
            hazardStep({ row: 0, col: 3 }),
            attackStep({ row: 1, col: 0 }, 5),
        ];

        expect(computeStreakAtIndex(chain, 0)).toBe(1);
        expect(computeStreakAtIndex(chain, 2)).toBe(2);
        expect(computeStreakAtIndex(chain, 4)).toBe(3);

        const sequence = buildAttackSequence(chain);

        expect(sequence.totalDamage).toBe(16);
        expect(sequence.stackMultipliers).toEqual({ attack: 1.16 });
    });

    it('resets the streak when the stackable behavior changes', () =>
    {
        const chain = [
            attackStep({ row: 0, col: 0 }, 5),
            {
                ...attackStep({ row: 0, col: 1 }, 0),
                behaviorId: 'defend',
                visualId: 'defend',
                definitionId: 'defend',
                armor: 3,
                damage: 0,
            },
            attackStep({ row: 0, col: 2 }, 5),
        ];

        expect(computeStreakAtIndex(chain, 2)).toBe(1);

        const sequence = buildAttackSequence(chain);

        expect(sequence.totalDamage).toBe(10);
    });

    it('explodes unchained enemy hazards for their power', () =>
    {
        const board = new BoardModel(createEmptyBoard(GRID_CONFIG.rows, GRID_CONFIG.cols));

        board.placeCard({ row: 0, col: 0 }, createCardInstance('attack', 'right'));
        board.placeCard({ row: 1, col: 0 }, createCardInstance('hazard', 'right', 'enemy'));

        const chain = planActivationChain(board, { row: 0, col: 0 });

        expect(computeHazardDamage(board, chain)).toBe(3);
        expect(planAttack(board, { row: 0, col: 0 }).hazardDamage).toBe(3);
    });

    it('disarms hazards that were included in the chain', () =>
    {
        const board = new BoardModel(createEmptyBoard(GRID_CONFIG.rows, GRID_CONFIG.cols));

        board.placeCard({ row: 0, col: 0 }, createCardInstance('attack', 'right'));
        board.placeCard({ row: 0, col: 1 }, createCardInstance('hazard', 'left', 'enemy'));

        const chain = planActivationChain(board, { row: 0, col: 0 });

        expect(chain).toHaveLength(2);
        expect(computeHazardDamage(board, chain)).toBe(0);
    });

    it('ignores enemy hazards for off-chain player bonuses', () =>
    {
        const board = new BoardModel(createEmptyBoard(GRID_CONFIG.rows, GRID_CONFIG.cols));

        board.placeCard({ row: 0, col: 0 }, createCardInstance('attack', 'right'));
        board.placeCard({ row: 1, col: 0 }, createCardInstance('defend', 'right'));
        board.placeCard({ row: 1, col: 1 }, createCardInstance('hazard', 'left', 'enemy'));

        const chain = planActivationChain(board, { row: 0, col: 0 });
        const bonuses = computeOffChainBonuses(board, chain);

        expect(bonuses).toEqual({ damage: 0, armor: 1 });
    });

    it('multiplies the next chain step after a field boost', () =>
    {
        const chain = [
            boostStep({ row: 0, col: 0 }),
            attackStep({ row: 0, col: 1 }, 10),
        ];

        expect(buildAttackSequence(chain).totalDamage).toBe(20);
    });

    it('propagates boost through jokers to the next attack', () =>
    {
        const chain = [
            boostStep({ row: 0, col: 0 }),
            jokerStep({ row: 0, col: 1 }),
            attackStep({ row: 0, col: 2 }, 10),
        ];

        expect(buildAttackSequence(chain).totalDamage).toBe(20);
    });

    it('applies boost after streak stacking on the buffed step', () =>
    {
        const chain = [
            attackStep({ row: 0, col: 0 }, 5),
            boostStep({ row: 0, col: 1 }),
            attackStep({ row: 0, col: 2 }, 5),
        ];

        expect(buildAttackSequence(chain).totalDamage).toBe(15);
    });

    it('routes through a field boost on the board', () =>
    {
        const board = new BoardModel(createEmptyBoard(GRID_CONFIG.rows, GRID_CONFIG.cols));

        board.placeCard({ row: 0, col: 0 }, createCardInstance('attack', 'right'));
        board.placeCard({ row: 0, col: 1 }, createCardInstance('boost', 'right', 'field'));
        board.placeCard({ row: 0, col: 2 }, createCardInstance('attack', 'left'));

        const sequence = planAttack(board, { row: 0, col: 0 });

        expect(sequence.chain.map((step) => step.behaviorId)).toEqual([ 'attack', 'boost', 'attack' ]);
        expect(sequence.totalDamage).toBe(15);
    });
});
