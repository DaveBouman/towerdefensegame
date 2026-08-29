import { describe, expect, it, beforeEach } from 'vitest';
import { GRID_CONFIG } from '../../config/gridConfig';
import { GAME_RULES } from '../config/cardRegistry';
import { planActivationChain, planAttack, planChainPathPreview, computeOffChainBonuses, computeHazardDamage, computeSiphonHeal, computeChainTypeMultipliers, buildAttackSequence, computeStreakAtIndex, getJokerDirectionChoices, getNextChainSlot, applyJokerChosenDirection, getNextChainSlotFromStep, resolveChainSteps, isBoostedChainStep } from './AttackPipeline';
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
        exitArrow: 'right',
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
        exitArrow: 'right',
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
        exitArrow: 'right',
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
        exitArrow: 'right',
        damage: 0,
        armor: 0,
    };
};

const thornsStep = (slot: SlotPosition, thorns = 1): ActivationStep =>
{
    const card = createCardInstance('thorns', 'right');

    return {
        slot,
        card,
        definitionId: 'thorns',
        behaviorId: 'thorns',
        visualId: 'thorns',
        arrow: 'right',
        exitArrow: 'right',
        damage: 0,
        armor: 0,
        thorns,
    };
};

const fireStep = (slot: SlotPosition, damage = 5): ActivationStep =>
{
    const card = createCardInstance('fire', 'right');

    return {
        slot,
        card,
        definitionId: 'fire',
        behaviorId: 'fire',
        visualId: 'fire',
        arrow: 'right',
        exitArrow: 'right',
        damage,
        armor: 0,
    };
};

const defendStep = (slot: SlotPosition, armor = 3): ActivationStep =>
{
    const card = createCardInstance('defend', 'right');

    return {
        slot,
        card,
        definitionId: 'defend',
        behaviorId: 'defend',
        visualId: 'defend',
        arrow: 'right',
        exitArrow: 'right',
        damage: 0,
        armor,
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

    it('routes a corner card into its horizontal neighbor first', () =>
    {
        const board = new BoardModel(createEmptyBoard(GRID_CONFIG.rows, GRID_CONFIG.cols));

        // down-left → enter left card; that card's down arrow continues the bend
        board.placeCard({ row: 1, col: 2 }, createCardInstance('corner-strike', 'down-left'));
        board.placeCard({ row: 1, col: 1 }, createCardInstance('attack', 'down'));
        board.placeCard({ row: 2, col: 1 }, createCardInstance('defend', 'right'));

        const chain = planActivationChain(board, { row: 1, col: 2 });

        expect(chain.map((step) => step.slot)).toEqual([
            { row: 1, col: 2 },
            { row: 1, col: 1 },
            { row: 2, col: 1 },
        ]);
    });

    it('routes down-right into the right neighbor first', () =>
    {
        const board = new BoardModel(createEmptyBoard(GRID_CONFIG.rows, GRID_CONFIG.cols));

        board.placeCard({ row: 1, col: 0 }, createCardInstance('corner-strike', 'down-right'));
        board.placeCard({ row: 1, col: 1 }, createCardInstance('attack', 'down'));
        board.placeCard({ row: 2, col: 1 }, createCardInstance('defend', 'left'));

        const chain = planActivationChain(board, { row: 1, col: 0 });

        expect(chain[1]?.slot).toEqual({ row: 1, col: 1 });
        expect(chain[2]?.slot).toEqual({ row: 2, col: 1 });
    });

    it('stops a corner card when the horizontal neighbor is empty', () =>
    {
        const board = new BoardModel(createEmptyBoard(GRID_CONFIG.rows, GRID_CONFIG.cols));

        board.placeCard({ row: 1, col: 0 }, createCardInstance('corner-strike', 'down-right'));
        // Card only on the diagonal — skipped; must occupy the right tile
        board.placeCard({ row: 2, col: 1 }, createCardInstance('attack', 'left'));

        const chain = planActivationChain(board, { row: 1, col: 0 });

        expect(chain).toHaveLength(1);
    });

    it('skewers the mid card for effects then lands two steps away', () =>
    {
        const board = new BoardModel(createEmptyBoard(GRID_CONFIG.rows, GRID_CONFIG.cols));

        board.placeCard({ row: 0, col: 0 }, createCardInstance('skewer', 'right'));
        // Mid points the wrong way — ignored; skewer forces continue right
        board.placeCard({ row: 0, col: 1 }, createCardInstance('defend', 'up'));
        board.placeCard({ row: 0, col: 2 }, createCardInstance('attack', 'down'));

        const chain = planActivationChain(board, { row: 0, col: 0 });

        expect(chain.map((step) => step.definitionId)).toEqual([ 'skewer', 'defend', 'attack' ]);
        expect(chain[1]?.exitArrow).toBe('right');
        expect(chain[1]?.armor).toBeGreaterThan(0);
    });

    it('skewers like a normal leap when the mid tile is empty', () =>
    {
        const board = new BoardModel(createEmptyBoard(GRID_CONFIG.rows, GRID_CONFIG.cols));

        board.placeCard({ row: 0, col: 0 }, createCardInstance('skewer', 'right'));
        board.placeCard({ row: 0, col: 2 }, createCardInstance('attack', 'up'));

        const chain = planActivationChain(board, { row: 0, col: 0 });

        expect(chain.map((step) => step.slot)).toEqual([
            { row: 0, col: 0 },
            { row: 0, col: 2 },
        ]);
    });

    it('wraps a phase-relay off the top edge to the bottom row', () =>
    {
        const board = new BoardModel(createEmptyBoard(GRID_CONFIG.rows, GRID_CONFIG.cols));

        board.placeCard({ row: 0, col: 1 }, createCardInstance('phase-relay', 'up'));
        board.placeCard({ row: 4, col: 1 }, createCardInstance('attack', 'right'));

        const chain = planActivationChain(board, { row: 0, col: 1 });

        expect(chain.map((step) => step.definitionId)).toEqual([ 'phase-relay', 'attack' ]);
        expect(chain[1]?.slot).toEqual({ row: 4, col: 1 });
    });

    it('wraps a phase-relay off the right edge to the left column', () =>
    {
        const board = new BoardModel(createEmptyBoard(GRID_CONFIG.rows, GRID_CONFIG.cols));

        board.placeCard({ row: 2, col: 4 }, createCardInstance('phase-relay', 'right'));
        board.placeCard({ row: 2, col: 0 }, createCardInstance('attack', 'right'));

        const chain = planActivationChain(board, { row: 2, col: 4 });

        expect(chain.map((step) => step.definitionId)).toEqual([ 'phase-relay', 'attack' ]);
        expect(chain[1]?.slot).toEqual({ row: 2, col: 0 });
    });

    it('wraps a phase-bulwark off the top edge and grants armor', () =>
    {
        const board = new BoardModel(createEmptyBoard(GRID_CONFIG.rows, GRID_CONFIG.cols));

        board.placeCard({ row: 0, col: 1 }, createCardInstance('phase-bulwark', 'up'));
        board.placeCard({ row: 4, col: 1 }, createCardInstance('attack', 'right'));

        const chain = planActivationChain(board, { row: 0, col: 1 });
        const resolved = resolveChainSteps(chain);

        expect(chain.map((step) => step.definitionId)).toEqual([ 'phase-bulwark', 'attack' ]);
        expect(chain[1]?.slot).toEqual({ row: 4, col: 1 });
        expect(resolved[0]?.armor).toBeGreaterThan(0);
        expect(resolved[0]?.behaviorId).toBe('defend');
    });

    it('jumps two spaces when leaving a leap card', () =>
    {
        const board = new BoardModel(createEmptyBoard(GRID_CONFIG.rows, GRID_CONFIG.cols));

        board.placeCard({ row: 0, col: 0 }, createCardInstance('attack-leap', 'right'));
        board.placeCard({ row: 0, col: 1 }, createCardInstance('attack', 'right'));
        board.placeCard({ row: 0, col: 2 }, createCardInstance('attack', 'up'));

        const chain = planActivationChain(board, { row: 0, col: 0 });

        expect(chain.map((step) => step.slot)).toEqual([
            { row: 0, col: 0 },
            { row: 0, col: 2 },
        ]);
        expect(chain).toHaveLength(2);
    });

    it('stops when a leap card has no card two spaces away', () =>
    {
        const board = new BoardModel(createEmptyBoard(GRID_CONFIG.rows, GRID_CONFIG.cols));

        board.placeCard({ row: 0, col: 0 }, createCardInstance('attack-leap', 'right'));
        board.placeCard({ row: 0, col: 1 }, createCardInstance('attack', 'left'));

        const chain = planActivationChain(board, { row: 0, col: 0 });

        expect(chain).toHaveLength(1);
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
        expect(planAttack(board, { row: 0, col: 0 }).totalDamage).toBe(22);
    });

    it('stops revisiting regular attack cards after the first activation', () =>
    {
        const board = new BoardModel(createEmptyBoard(GRID_CONFIG.rows, GRID_CONFIG.cols));

        board.placeCard({ row: 0, col: 0 }, createCardInstance('attack', 'right'));
        board.placeCard({ row: 0, col: 1 }, createCardInstance('attack', 'left'));

        const chain = planActivationChain(board, { row: 0, col: 0 });

        expect(chain).toHaveLength(2);
    });

    it('lets loop-reset reopen earlier slots in the chain', () =>
    {
        const board = new BoardModel(createEmptyBoard(GRID_CONFIG.rows, GRID_CONFIG.cols));

        board.placeCard({ row: 0, col: 0 }, createCardInstance('attack', 'right'));
        board.placeCard({ row: 0, col: 1 }, createCardInstance('loop-reset', 'right', 'player', 'left'));

        const chain = planActivationChain(board, { row: 0, col: 0 });

        expect(chain.slice(0, 3).map((step) => step.definitionId)).toEqual([ 'attack', 'loop-reset', 'attack' ]);
        expect(chain[0]!.slot).toEqual(chain[2]!.slot);
        expect(chain[1]!.exitArrow).toBe('left');
    });

    it('only resets the chain once per attack', () =>
    {
        const board = new BoardModel(createEmptyBoard(GRID_CONFIG.rows, GRID_CONFIG.cols));

        board.placeCard({ row: 0, col: 0 }, createCardInstance('attack', 'right'));
        board.placeCard({ row: 0, col: 1 }, createCardInstance('loop-reset', 'right', 'player', 'left'));

        const chain = planActivationChain(board, { row: 0, col: 0 });

        expect(chain).toHaveLength(4);
        expect(chain.filter((step) => step.definitionId === 'loop-reset')).toHaveLength(2);
        expect(chain[1]!.exitArrow).toBe('left');
        expect(chain[3]!.exitArrow).toBe('right');
        expect(planAttack(board, { row: 0, col: 0 }).totalDamage).toBe(11);
    });

    it('reopens every card before the loop but not cards after it on the return path', () =>
    {
        const board = new BoardModel(createEmptyBoard(GRID_CONFIG.rows, GRID_CONFIG.cols));

        board.placeCard({ row: 0, col: 0 }, createCardInstance('attack', 'right'));
        board.placeCard({ row: 0, col: 1 }, createCardInstance('attack', 'right'));
        board.placeCard({ row: 0, col: 2 }, createCardInstance('loop-reset', 'down', 'player', 'left'));
        board.placeCard({ row: 1, col: 2 }, createCardInstance('attack', 'left'));
        board.placeCard({ row: 1, col: 1 }, createCardInstance('attack', 'left'));
        board.placeCard({ row: 1, col: 0 }, createCardInstance('attack', 'up'));

        const chain = planActivationChain(board, { row: 0, col: 0 });

        expect(chain.map((step) => step.definitionId)).toEqual([
            'attack',
            'attack',
            'loop-reset',
            'attack',
            'loop-reset',
            'attack',
            'attack',
            'attack',
            'attack',
        ]);
        expect(chain.filter((step) => step.slot.row === 0 && step.slot.col === 0)).toHaveLength(2);
        expect(chain.filter((step) => step.slot.row === 0 && step.slot.col === 1)).toHaveLength(2);
        expect(chain.filter((step) => step.slot.row === 1 && step.slot.col === 2)).toHaveLength(1);
        expect(chain.filter((step) => step.definitionId === 'loop-reset')).toHaveLength(2);
        expect(chain[2]!.exitArrow).toBe('left');
        expect(chain[4]!.exitArrow).toBe('down');
    });

    it('plans damage from attack cards in the chain', () =>
    {
        const board = new BoardModel(createEmptyBoard(GRID_CONFIG.rows, GRID_CONFIG.cols));

        board.placeCard({ row: 0, col: 0 }, createCardInstance('attack', 'right'));
        board.placeCard({ row: 0, col: 1 }, createCardInstance('attack', 'left'));

        const sequence = planAttack(board);

        expect(sequence.steps).toHaveLength(2);
        expect(sequence.totalDamage).toBe(11);
        expect(sequence.stepMs).toBe(GAME_RULES.activationStepMs);
        expect(sequence.durationMs).toBe(2 * GAME_RULES.activationStepMs);
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

    it('previews past an unset Reroute with a tentative exit', () =>
    {
        const board = new BoardModel(createEmptyBoard(GRID_CONFIG.rows, GRID_CONFIG.cols));

        board.placeCard({ row: 0, col: 0 }, createCardInstance('attack', 'right'));
        board.placeCard({ row: 0, col: 1 }, createCardInstance('joker'));
        board.placeCard({ row: 0, col: 3 }, createCardInstance('attack', 'left'));

        const preview = planChainPathPreview(board, { row: 0, col: 0 });

        expect(preview.slots.length).toBeGreaterThanOrEqual(3);
        expect(preview.tentativeFromIndex).toBe(1);
        expect(preview.slots[2]).toEqual({ row: 0, col: 3 });
    });

    it('lets the joker jump two spaces when a direction is chosen', () =>
    {
        const board = new BoardModel(createEmptyBoard(GRID_CONFIG.rows, GRID_CONFIG.cols));

        board.placeCard({ row: 0, col: 0 }, createCardInstance('attack', 'right'));
        board.placeCard({ row: 0, col: 1 }, createCardInstance('joker', 'right'));
        board.placeCard({ row: 0, col: 3 }, createCardInstance('attack', 'left'));

        const choices = getJokerDirectionChoices(board, { row: 0, col: 1 });

        expect(choices).toContain('right');
        expect(getNextChainSlot(board, { row: 0, col: 1 }, 'right', 2)).toEqual({ row: 0, col: 3 });
    });

    it('follows the chosen joker exit arrow, not the placeholder right arrow', () =>
    {
        const board = new BoardModel(createEmptyBoard(GRID_CONFIG.rows, GRID_CONFIG.cols));

        board.placeCard({ row: 2, col: 1 }, createCardInstance('joker', 'right'));
        board.placeCard({ row: 2, col: 3 }, createCardInstance('attack', 'left'));
        board.placeCard({ row: 0, col: 3 }, createCardInstance('attack', 'left'));

        const step = jokerStep({ row: 2, col: 1 });

        expect(getNextChainSlotFromStep(board, step)).toEqual({ row: 2, col: 3 });

        applyJokerChosenDirection(step, 'up-right');

        expect(step.exitArrow).toBe('up-right');
        expect(step.card.jokerDirectionChosen).toBe(true);
        expect(getNextChainSlotFromStep(board, step)).toEqual({ row: 0, col: 3 });
    });

    it('doubles resolved damage for cards with stepDamageMultiplier', () =>
    {
        const board = new BoardModel(createEmptyBoard(GRID_CONFIG.rows, GRID_CONFIG.cols));

        board.placeCard({ row: 0, col: 0 }, createCardInstance('switchback', 'right'));

        const chain = planActivationChain(board, { row: 0, col: 0 });
        const resolved = resolveChainSteps(chain);

        expect(resolved).toHaveLength(1);
        expect(resolved[0]!.damage).toBe(10);
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
        expect(bonuses).toEqual({ damage: 0, armor: 4 });
    });

    it('applies chain stacking to repeated attack behaviors', () =>
    {
        const board = new BoardModel(createEmptyBoard(GRID_CONFIG.rows, GRID_CONFIG.cols));

        board.placeCard({ row: 0, col: 0 }, createCardInstance('attack', 'right'));
        board.placeCard({ row: 0, col: 1 }, createCardInstance('attack', 'right'));
        board.placeCard({ row: 0, col: 2 }, createCardInstance('attack', 'left'));

        const sequence = planAttack(board, { row: 0, col: 0 });

        expect(computeChainTypeMultipliers(sequence.chain)).toEqual({ attack: 1.3 });
        expect(sequence.chain).toHaveLength(3);
        expect(sequence.totalDamage).toBe(18);
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

        expect(sequence.totalDamage).toBe(23);
        expect(sequence.stackMultipliers).toEqual({ attack: 1.3 });
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

        expect(computeHazardDamage(board, chain)).toBe(4);
        expect(planAttack(board, { row: 0, col: 0 }).hazardDamage).toBe(4);
    });

    it('heals from unchained enemy siphon nodes and converts them in-chain', () =>
    {
        const unchained = new BoardModel(createEmptyBoard(GRID_CONFIG.rows, GRID_CONFIG.cols));

        unchained.placeCard({ row: 0, col: 0 }, createCardInstance('attack', 'right'));
        unchained.placeCard({ row: 1, col: 0 }, createCardInstance('siphon', 'right', 'enemy'));

        const unchainedChain = planActivationChain(unchained, { row: 0, col: 0 });

        expect(computeSiphonHeal(unchained, unchainedChain)).toBe(8);
        expect(planAttack(unchained, { row: 0, col: 0 }).siphonHeal).toBe(8);
        expect(planAttack(unchained, { row: 0, col: 0 }).hazardDamage).toBe(0);

        const chained = new BoardModel(createEmptyBoard(GRID_CONFIG.rows, GRID_CONFIG.cols));

        chained.placeCard({ row: 0, col: 0 }, createCardInstance('attack', 'right'));
        chained.placeCard({ row: 0, col: 1 }, createCardInstance('siphon', 'left', 'enemy'));

        const sequence = planAttack(chained, { row: 0, col: 0 });

        expect(sequence.chain.some((step) => step.definitionId === 'siphon')).toBe(true);
        expect(sequence.chain.find((step) => step.definitionId === 'siphon')?.behaviorId).toBe('attack');
        expect(sequence.chain.find((step) => step.definitionId === 'siphon')?.damage).toBeGreaterThan(0);
        expect(sequence.siphonHeal).toBe(0);
        expect(sequence.totalDamage).toBeGreaterThan(0);
    });

    it('punishes unchained burden with double hand-end penalty', () =>
    {
        const board = new BoardModel(createEmptyBoard(GRID_CONFIG.rows, GRID_CONFIG.cols));

        board.placeCard({ row: 0, col: 0 }, createCardInstance('attack', 'right'));
        board.placeCard({ row: 1, col: 0 }, createCardInstance('burden', 'right'));

        const sequence = planAttack(board, { row: 0, col: 0 });

        expect(sequence.abilityPlayerDamage).toBe(10);
    });

    it('does not punish burden when it is routed into the chain', () =>
    {
        const board = new BoardModel(createEmptyBoard(GRID_CONFIG.rows, GRID_CONFIG.cols));

        board.placeCard({ row: 0, col: 0 }, createCardInstance('attack', 'right'));
        board.placeCard({ row: 0, col: 1 }, createCardInstance('burden', 'right'));

        const sequence = planAttack(board, { row: 0, col: 0 });

        expect(sequence.chain.some((step) => step.definitionId === 'burden')).toBe(true);
        expect(sequence.abilityPlayerDamage).toBe(0);
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

    it('converts a trap at chain start when the chain continues to an attack', () =>
    {
        const board = new BoardModel(createEmptyBoard(GRID_CONFIG.rows, GRID_CONFIG.cols));

        board.placeCard({ row: 0, col: 0 }, createCardInstance('hazard', 'right', 'enemy'));
        board.placeCard({ row: 0, col: 1 }, createCardInstance('attack', 'left'));

        const sequence = planAttack(board, { row: 0, col: 0 });

        expect(sequence.chain).toHaveLength(2);
        expect(sequence.chain[0]?.damage).toBe(4);
        expect(sequence.chain[1]?.damage).toBe(6);
        expect(sequence.totalDamage).toBe(10);
        expect(sequence.hazardDamage).toBe(0);
    });

    it('disarms a lone trap at chain start without dealing damage', () =>
    {
        const board = new BoardModel(createEmptyBoard(GRID_CONFIG.rows, GRID_CONFIG.cols));

        board.placeCard({ row: 0, col: 0 }, createCardInstance('hazard', 'right', 'enemy'));

        const sequence = planAttack(board, { row: 0, col: 0 });

        expect(sequence.chain).toHaveLength(1);
        expect(sequence.chain[0]?.damage).toBe(0);
        expect(sequence.totalDamage).toBe(0);
        expect(sequence.hazardDamage).toBe(0);
    });

    it('converts a trap at chain start into armor when the chain continues to defend', () =>
    {
        const board = new BoardModel(createEmptyBoard(GRID_CONFIG.rows, GRID_CONFIG.cols));

        board.placeCard({ row: 0, col: 0 }, createCardInstance('hazard', 'right', 'enemy'));
        board.placeCard({ row: 0, col: 1 }, createCardInstance('defend', 'left'));

        const sequence = planAttack(board, { row: 0, col: 0 });

        expect(sequence.chain[0]?.damage).toBe(0);
        expect(sequence.chain[0]?.armor).toBe(4);
        expect(sequence.chain[1]?.armor).toBe(3);
    });

    it('ignores enemy hazards for off-chain player bonuses', () =>
    {
        const board = new BoardModel(createEmptyBoard(GRID_CONFIG.rows, GRID_CONFIG.cols));

        board.placeCard({ row: 0, col: 0 }, createCardInstance('attack', 'right'));
        board.placeCard({ row: 1, col: 0 }, createCardInstance('defend', 'right'));
        board.placeCard({ row: 1, col: 1 }, createCardInstance('hazard', 'left', 'enemy'));

        const chain = planActivationChain(board, { row: 0, col: 0 });
        const bonuses = computeOffChainBonuses(board, chain);

        expect(bonuses).toEqual({ damage: 0, armor: 2 });
    });

    it('stacks multiple field boosts multiplicatively', () =>
    {
        const chain = [
            boostStep({ row: 0, col: 0 }),
            boostStep({ row: 0, col: 1 }),
            attackStep({ row: 0, col: 2 }, 10),
        ];

        expect(buildAttackSequence(chain).totalDamage).toBe(40);
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

        expect(buildAttackSequence(chain).totalDamage).toBe(17);
    });

    it('routes through a field boost on the board', () =>
    {
        const board = new BoardModel(createEmptyBoard(GRID_CONFIG.rows, GRID_CONFIG.cols));

        board.placeCard({ row: 0, col: 0 }, createCardInstance('attack', 'right'));
        board.placeCard({ row: 0, col: 1 }, createCardInstance('boost', 'right', 'field'));
        board.placeCard({ row: 0, col: 2 }, createCardInstance('attack', 'left'));

        const sequence = planAttack(board, { row: 0, col: 0 });

        expect(sequence.chain.map((step) => step.behaviorId)).toEqual([ 'attack', 'boost', 'attack' ]);
        expect(sequence.totalDamage).toBe(17);
    });

    it('doubles fire damage and alternation bonus on the boosted special step only', () =>
    {
        const board = new BoardModel(createEmptyBoard(GRID_CONFIG.rows, GRID_CONFIG.cols));
        const chain = [
            boostStep({ row: 0, col: 0 }),
            fireStep({ row: 0, col: 1 }),
            attackStep({ row: 0, col: 2 }, 5),
            defendStep({ row: 0, col: 3 }, 3),
        ];

        const sequence = buildAttackSequence(chain, board);

        expect(sequence.chain[1]?.damage).toBe(10);
        expect(sequence.chain[2]?.damage).toBe(5);
        expect(sequence.totalDamage).toBe(15);
        expect(sequence.abilityEnemyDamage).toBe(6);
    });

    it('doubles poison trail damage when poison is the boosted step', () =>
    {
        const board = new BoardModel(createEmptyBoard(GRID_CONFIG.rows, GRID_CONFIG.cols));

        board.placeCard({ row: 0, col: 0 }, createCardInstance('boost', 'right', 'field'));
        board.placeCard({ row: 0, col: 1 }, createCardInstance('poison', 'right'));
        board.placeCard({ row: 0, col: 2 }, createCardInstance('defend', 'right'));
        board.placeCard({ row: 0, col: 3 }, createCardInstance('defend', 'left'));

        const sequence = planAttack(board, { row: 0, col: 0 });

        expect(sequence.abilityPoisonStacks).toBe(4);
    });
});

describe('player thorns chain resolve', () =>
{
    it('doubles thorns under a field boost', () =>
    {
        const resolved = resolveChainSteps([
            boostStep({ row: 0, col: 0 }),
            thornsStep({ row: 0, col: 1 }),
        ]);

        expect(resolved[1]!.thorns).toBe(2);
        expect(isBoostedChainStep(resolved, 1)).toBe(true);
    });

    it('stacks two boosts into ×4 thorns', () =>
    {
        const resolved = resolveChainSteps([
            boostStep({ row: 0, col: 0 }),
            boostStep({ row: 0, col: 1 }),
            thornsStep({ row: 0, col: 2 }),
        ]);

        expect(resolved[2]!.thorns).toBe(4);
    });

    it('reads thorns from a placed Thorns card', () =>
    {
        const board = new BoardModel(createEmptyBoard(GRID_CONFIG.rows, GRID_CONFIG.cols));

        board.placeCard({ row: 0, col: 0 }, createCardInstance('thorns', 'right'));

        const chain = planActivationChain(board, { row: 0, col: 0 });

        expect(chain[0]?.thorns).toBe(1);
        expect(chain[0]?.behaviorId).toBe('thorns');
    });

    it('spent exhaust cards keep routing but contribute nothing', () =>
    {
        const board = new BoardModel(createEmptyBoard(GRID_CONFIG.rows, GRID_CONFIG.cols));
        const salvage = createCardInstance('salvage', 'right');

        salvage.exhausted = true;
        salvage.spent = true;
        board.placeCard({ row: 0, col: 0 }, salvage);
        board.placeCard({ row: 0, col: 1 }, createCardInstance('attack', 'right'));

        const chain = planActivationChain(board, { row: 0, col: 0 });

        expect(chain).toHaveLength(2);
        expect(chain[0]?.damage).toBe(0);
        expect(chain[0]?.armor).toBe(0);
        expect(chain[1]?.damage).toBeGreaterThan(0);
    });

    it('redline contributes both attack damage and armor', () =>
    {
        const board = new BoardModel(createEmptyBoard(GRID_CONFIG.rows, GRID_CONFIG.cols));

        board.placeCard({ row: 0, col: 0 }, createCardInstance('redline', 'right'));

        const chain = planActivationChain(board, { row: 0, col: 0 });

        expect(chain).toHaveLength(1);
        expect(chain[0]?.damage).toBe(13);
        expect(chain[0]?.armor).toBe(13);
        expect(chain[0]?.behaviorId).toBe('redline');
    });
});
