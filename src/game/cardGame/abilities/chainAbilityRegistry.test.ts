import { describe, expect, it, beforeEach } from 'vitest';
import { GRID_CONFIG } from '../../config/gridConfig';
import { resolveChainAbilities } from './chainAbilityRegistry';
import { getDefendIndicesReplacedByPoison } from './poisonReplacement';
import { BoardModel, createEmptyBoard } from '../domain/BoardModel';
import { createCardInstance, resetCardInstanceCounter } from '../domain/createCardInstance';
import type { ActivationStep } from '../domain/types';
import { planActivationChain, planAttack, resolveChainSteps } from '../combat/AttackPipeline';

const activationStep = (
    definitionId: string,
    row: number,
    col: number,
    arrow: import('../domain/cardDirections').CardDirection = 'right',
): ActivationStep =>
{
    const card = createCardInstance(definitionId, arrow);
    const behaviorId = definitionId === 'poison'
        ? 'poison'
        : definitionId === 'fire'
            ? 'fire'
            : definitionId.startsWith('attack')
                ? 'attack'
                : definitionId.startsWith('defend')
                    ? 'defend'
                    : definitionId;

    return {
        slot: { row, col },
        card,
        definitionId,
        behaviorId,
        visualId: definitionId === 'poison' ? 'poison' : definitionId === 'fire' ? 'fire' : behaviorId,
        arrow,
        exitArrow: arrow,
        damage: behaviorId === 'attack' || behaviorId === 'fire' ? 5 : 0,
        armor: behaviorId === 'defend' ? 3 : 0,
    };
};

describe('chain abilities', () =>
{
    beforeEach(() =>
    {
        resetCardInstanceCounter();
    });

    it('replaces defend cards after poison until an attack breaks the streak', () =>
    {
        const board = new BoardModel(createEmptyBoard(GRID_CONFIG.rows, GRID_CONFIG.cols));
        const chain = [
            activationStep('poison', 0, 0, 'right'),
            activationStep('defend', 0, 1),
            activationStep('defend', 0, 2, 'right'),
            activationStep('attack', 1, 2, 'left'),
            activationStep('defend', 1, 1),
        ];

        expect(getDefendIndicesReplacedByPoison(chain, 0)).toEqual([ 1, 2 ]);

        const resolved = resolveChainAbilities(chain, board);
        const scaled = resolveChainSteps(chain);

        expect(resolved.enemyDamage).toBe(2);
        expect(scaled[1]?.armor).toBe(0);
        expect(scaled[2]?.armor).toBe(0);
        expect(scaled[4]?.armor).toBe(3);
    });

    it('keeps armor on defends before poison and after the streak breaks', () =>
    {
        const board = new BoardModel(createEmptyBoard(GRID_CONFIG.rows, GRID_CONFIG.cols));
        const chain = [
            activationStep('defend', 0, 0),
            activationStep('poison', 0, 1, 'right'),
            activationStep('defend', 0, 2),
            activationStep('defend', 0, 3, 'right'),
            activationStep('attack', 1, 3, 'left'),
            activationStep('defend', 1, 2),
        ];

        expect(getDefendIndicesReplacedByPoison(chain, 1)).toEqual([ 2, 3 ]);

        const resolved = resolveChainAbilities(chain, board);
        const scaled = resolveChainSteps(chain);

        expect(resolved.enemyDamage).toBe(2);
        expect(scaled[0]?.armor).toBe(3);
        expect(scaled[2]?.armor).toBe(0);
        expect(scaled[3]?.armor).toBe(0);
        expect(scaled[5]?.armor).toBe(3);
    });

    it('does not poison attack cards after poison', () =>
    {
        const board = new BoardModel(createEmptyBoard(GRID_CONFIG.rows, GRID_CONFIG.cols));
        const chain = [
            activationStep('attack', 0, 0),
            activationStep('poison', 0, 1, 'right'),
            activationStep('attack', 0, 2),
            activationStep('defend', 0, 3, 'left'),
        ];

        const resolved = resolveChainAbilities(chain, board);

        expect(resolved.enemyDamage).toBe(0);
    });

    it('deals no poison damage when the poison card is last in the chain', () =>
    {
        const board = new BoardModel(createEmptyBoard(GRID_CONFIG.rows, GRID_CONFIG.cols));
        const chain = [
            activationStep('attack', 0, 0),
            activationStep('poison', 0, 1),
        ];

        const resolved = resolveChainAbilities(chain, board);

        expect(resolved.effects).toHaveLength(0);
        expect(resolved.enemyDamage).toBe(0);
    });

    it('includes poison damage in the attack sequence', () =>
    {
        const board = new BoardModel(createEmptyBoard(GRID_CONFIG.rows, GRID_CONFIG.cols));

        board.placeCard({ row: 0, col: 0 }, createCardInstance('defend', 'right'));
        board.placeCard({ row: 0, col: 1 }, createCardInstance('poison', 'right'));
        board.placeCard({ row: 0, col: 2 }, createCardInstance('defend', 'left'));

        const sequence = planAttack(board, { row: 0, col: 0 });

        expect(sequence.abilityEnemyDamage).toBe(1);
        expect(sequence.chain[0]?.armor).toBe(3);
        expect(sequence.chain[2]?.armor).toBe(0);
    });

    it('resolves poison from a planned board chain with only defends after it', () =>
    {
        const board = new BoardModel(createEmptyBoard(GRID_CONFIG.rows, GRID_CONFIG.cols));

        board.placeCard({ row: 0, col: 0 }, createCardInstance('poison', 'right'));
        board.placeCard({ row: 0, col: 1 }, createCardInstance('defend', 'right'));
        board.placeCard({ row: 0, col: 2 }, createCardInstance('defend', 'left'));

        const chain = planActivationChain(board, { row: 0, col: 0 });

        expect(chain.map((step) => step.definitionId)).toEqual([ 'poison', 'defend', 'defend' ]);
        expect(planAttack(board, { row: 0, col: 0 }).abilityEnemyDamage).toBe(2);
    });

    it('adds bonus fire damage when attack and defend alternate after fire', () =>
    {
        const board = new BoardModel(createEmptyBoard(GRID_CONFIG.rows, GRID_CONFIG.cols));
        const chain = [
            activationStep('fire', 0, 0, 'right'),
            activationStep('attack', 0, 1),
            activationStep('defend', 0, 2, 'right'),
            activationStep('attack', 1, 2, 'left'),
        ];

        const resolved = resolveChainAbilities(chain, board);

        expect(resolved.enemyDamage).toBe(6);
        expect(resolved.effects[0]?.abilityId).toBe('fire-alternation');
    });

    it('deals no fire bonus when the chain does not alternate after fire', () =>
    {
        const board = new BoardModel(createEmptyBoard(GRID_CONFIG.rows, GRID_CONFIG.cols));
        const chain = [
            activationStep('fire', 0, 0, 'right'),
            activationStep('attack', 0, 1),
            activationStep('attack', 0, 2, 'right'),
        ];

        const resolved = resolveChainAbilities(chain, board);

        expect(resolved.enemyDamage).toBe(0);
    });

    it('includes fire bonus damage in the attack sequence', () =>
    {
        const board = new BoardModel(createEmptyBoard(GRID_CONFIG.rows, GRID_CONFIG.cols));

        board.placeCard({ row: 0, col: 0 }, createCardInstance('fire', 'right'));
        board.placeCard({ row: 0, col: 1 }, createCardInstance('attack', 'right'));
        board.placeCard({ row: 0, col: 2 }, createCardInstance('defend', 'left'));

        const sequence = planAttack(board, { row: 0, col: 0 });

        expect(sequence.totalDamage).toBe(10);
        expect(sequence.abilityEnemyDamage).toBe(3);
    });

    it('doubles poison trail damage when poison is boosted', () =>
    {
        const board = new BoardModel(createEmptyBoard(GRID_CONFIG.rows, GRID_CONFIG.cols));
        const chain = [
            activationStep('boost', 0, 0, 'right'),
            activationStep('poison', 0, 1, 'right'),
            activationStep('defend', 0, 2),
            activationStep('defend', 0, 3, 'right'),
        ];

        const resolved = resolveChainAbilities(chain, board);

        expect(resolved.enemyDamage).toBe(4);
    });

    it('stacks fire alternation and poison trail when both are in the chain', () =>
    {
        const board = new BoardModel(createEmptyBoard(GRID_CONFIG.rows, GRID_CONFIG.cols));
        const chain = [
            activationStep('fire', 0, 0, 'right'),
            activationStep('poison', 0, 1, 'right'),
            activationStep('defend', 0, 2),
            activationStep('attack', 0, 3),
        ];

        const resolved = resolveChainAbilities(chain, board);
        const scaled = resolveChainSteps(chain);

        expect(resolved.effects).toHaveLength(2);
        expect(resolved.enemyDamage).toBe(4);
        expect(scaled[2]?.armor).toBe(0);
    });

    it('keeps fire counting after poison and poison counting after fire', () =>
    {
        const board = new BoardModel(createEmptyBoard(GRID_CONFIG.rows, GRID_CONFIG.cols));
        const chain = [
            activationStep('poison', 0, 0, 'right'),
            activationStep('fire', 0, 1, 'right'),
            activationStep('defend', 0, 2),
            activationStep('attack', 0, 3),
            activationStep('defend', 0, 4),
        ];

        const resolved = resolveChainAbilities(chain, board);
        const scaled = resolveChainSteps(chain);

        expect(resolved.enemyDamage).toBe(7);
        expect(scaled[2]?.armor).toBe(0);
        expect(scaled[4]?.armor).toBe(3);
    });

    it('lets fire alternation continue after an attack that ends poison', () =>
    {
        const board = new BoardModel(createEmptyBoard(GRID_CONFIG.rows, GRID_CONFIG.cols));
        const chain = [
            activationStep('fire', 0, 0, 'right'),
            activationStep('poison', 0, 1, 'right'),
            activationStep('defend', 0, 2),
            activationStep('attack', 0, 3),
            activationStep('defend', 0, 4),
        ];

        const resolved = resolveChainAbilities(chain, board);

        expect(resolved.enemyDamage).toBe(7);
    });
});
