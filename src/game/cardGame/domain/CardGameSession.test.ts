import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../events/CardGameEventBus', () => ({
    CardGameEventBus: {
        emit: vi.fn(),
        on: vi.fn(),
        off: vi.fn(),
    },
}));

import { GAME_RULES } from '../config/cardRegistry';
import { getDefaultCardGameEnemy } from '../config/enemyCatalog';
import { CardGameSession } from './CardGameSession';
import { createCardInstance, resetCardInstanceCounter } from './createCardInstance';
import { getInBoundsDirections, randomInBoundsDirectionForPool } from './cardDirections';
import { GRID_CONFIG } from '../../config/gridConfig';
import type { AttackSequence } from './types';

const emptySequence = (): AttackSequence => ({
    chain: [],
    steps: [],
    totalDamage: 0,
    offChainDamage: 0,
    offChainArmor: 0,
    hazardDamage: 0,
    chainAbilityEffects: [],
    abilityEnemyDamage: 0,
    abilityPlayerDamage: 0,
    abilityArmorGain: 0,
    disarmResults: [],
    stackMultipliers: {},
    stepMs: 1500,
    durationMs: 0,
});

describe('CardGameSession enemy turn', () =>
{
    beforeEach(() =>
    {
        resetCardInstanceCounter();
    });

    it('starts with a deck and a full hand', () =>
    {
        const session = new CardGameSession();

        expect(session.getHand()).toHaveLength(GAME_RULES.handSize);
        expect(session.getDeckSize()).toBe(GAME_RULES.deckSize - GAME_RULES.handSize);
    });

    it('replaces the whole hand after enemy turn', () =>
    {
        const session = new CardGameSession();
        const originalHand = session.getHand().map((card) => card.instanceId);

        session.placeCardFromHand(0, { row: 0, col: 0 });
        session.clearBoard();

        const action = session.beginEnemyTurn();

        expect(action).not.toBeNull();

        if (action)
        {
            session.completeEnemyTurn(action);
        }

        expect(session.getHand()).toHaveLength(GAME_RULES.handSize);
        expect(session.getHand().map((card) => card.instanceId)).not.toEqual(originalHand);
        expect(session.getDiscardSize()).toBe(GAME_RULES.handSize);
    });

    it('reshuffles the discard pile when the deck cannot satisfy a draw', () =>
    {
        const session = new CardGameSession();
        const placementSlots = [
            { row: 0, col: 0 },
            { row: 0, col: 1 },
            { row: 0, col: 2 },
            { row: 0, col: 3 },
            { row: 1, col: 0 },
            { row: 1, col: 1 },
            { row: 1, col: 2 },
            { row: 1, col: 3 },
            { row: 2, col: 0 },
            { row: 2, col: 1 },
        ] as const;

        for (const slot of placementSlots)
        {
            session.placeCardFromHand(0, slot);
        }

        session.clearBoard();
        expect(session.getHand()).toHaveLength(0);
        expect(session.getDiscardSize()).toBe(GAME_RULES.handSize);
        expect(session.getDeckSize()).toBe(GAME_RULES.deckSize - GAME_RULES.handSize);

        session.renewHand();

        expect(session.getHand()).toHaveLength(GAME_RULES.handSize);
        expect(session.getDiscardSize()).toBe(GAME_RULES.handSize);
        expect(session.getDeckSize()).toBe(GAME_RULES.deckSize - GAME_RULES.handSize * 2);

        for (const slot of placementSlots)
        {
            session.placeCardFromHand(0, slot);
        }

        session.clearBoard();
        expect(session.getHand()).toHaveLength(0);
        expect(session.getDiscardSize()).toBe(GAME_RULES.handSize * 2);
        expect(session.getDeckSize()).toBe(GAME_RULES.deckSize - GAME_RULES.handSize * 2);

        session.renewHand();

        expect(session.getHand()).toHaveLength(GAME_RULES.handSize);
        expect(session.getDiscardSize()).toBe(0);
        expect(session.getDeckSize()).toBe(GAME_RULES.deckSize - GAME_RULES.handSize);
    });

    it('applies defend armor as shield that blocks enemy attacks', () =>
    {
        const session = new CardGameSession();

        session.completeAttack({
            ...emptySequence(),
            chain: [
                {
                    slot: { row: 0, col: 0 },
                    card: {
                        instanceId: 'defend-1',
                        definitionId: 'defend',
                        arrow: 'right',
                    },
                    definitionId: 'defend',
                    behaviorId: 'defend',
                    visualId: 'defend',
                    arrow: 'right',
                    damage: 0,
                    armor: 3,
                },
            ],
        });

        expect(session.getPlayer().shield).toBe(3);

        const result = session.resolveEnemyAttack(4);

        expect(result.shieldAbsorbed).toBe(3);
        expect(result.healthDamage).toBe(1);
        expect(session.getPlayer().shield).toBe(0);
        expect(session.getPlayer().health).toBe(GAME_RULES.player.maxHealth - 1);
    });

    it('absorbs player damage with enemy shield first', () =>
    {
        const session = new CardGameSession();

        session.resolveEnemyShield(5);
        const result = session.dealAttackDamage(8);

        expect(result.shieldAbsorbed).toBe(5);
        expect(result.healthDamage).toBe(3);
        expect(result.enemy.shield).toBe(0);
        expect(result.enemy.health).toBe(getDefaultCardGameEnemy().maxHealth - 3);
    });

    it('keeps enemy shield until the next enemy turn begins', () =>
    {
        const session = new CardGameSession();

        session.resolveEnemyShield(5);
        expect(session.getEnemy().shield).toBe(5);

        session.dealAttackDamage(2);
        expect(session.getEnemy().shield).toBe(3);

        const action = session.beginEnemyTurn();

        expect(action).not.toBeNull();
        expect(session.getEnemy().shield).toBe(0);

        if (action)
        {
            session.completeEnemyTurn(action);
        }
    });

    it('blocks placement during enemy turn', () =>
    {
        const session = new CardGameSession();
        const action = session.beginEnemyTurn();

        expect(action).not.toBeNull();
        expect(session.placeCardFromHand(0, { row: 2, col: 0 })).toBe(false);

        if (action)
        {
            session.completeEnemyTurn(action);
        }
    });

    it('queues the next enemy intent after a turn resolves', () =>
    {
        const session = new CardGameSession();
        const action = session.beginEnemyTurn();

        expect(action).not.toBeNull();

        if (action)
        {
            session.completeEnemyTurn(action);
        }

        expect(session.getQueuedEnemyTurn()).not.toBeNull();
    });

    it('clears shield when the player turn begins', () =>
    {
        const session = new CardGameSession();

        session.completeAttack({
            ...emptySequence(),
            chain: [
                {
                    slot: { row: 0, col: 0 },
                    card: {
                        instanceId: 'defend-1',
                        definitionId: 'defend',
                        arrow: 'right',
                    },
                    definitionId: 'defend',
                    behaviorId: 'defend',
                    visualId: 'defend',
                    arrow: 'right',
                    damage: 0,
                    armor: 3,
                },
            ],
        });

        const action = session.beginEnemyTurn();

        if (action?.steps.some((step) => step.kind === 'shield'))
        {
            session.completeEnemyTurn(action);
        }
        else if (action)
        {
            session.resolveEnemyAttack(action.amount);
            session.completeEnemyTurn(action);
        }

        expect(session.getPlayer().shield).toBe(0);
    });

    it('adds off-chain armor when completing an attack', () =>
    {
        const session = new CardGameSession();

        session.completeAttack({
            ...emptySequence(),
            offChainArmor: 3,
            chain: [
                {
                    slot: { row: 0, col: 0 },
                    card: createCardInstance('attack', 'right'),
                    definitionId: 'attack',
                    behaviorId: 'attack',
                    visualId: 'attack',
                    arrow: 'right',
                    damage: 5,
                    armor: 0,
                },
            ],
        });

        expect(session.getPlayer().shield).toBe(3);
    });

    it('replaces a board card when placing from hand onto an occupied slot', () =>
    {
        const session = new CardGameSession();
        const handCard = session.getHand()[0];

        session.placeCardFromHand(0, { row: 0, col: 0 });
        session.placeCardFromHand(0, { row: 0, col: 1 });

        const replacement = session.getHand()[0];

        expect(session.placeCardFromHand(0, { row: 0, col: 0 })).toBe(true);
        expect(session.board.getCardAt({ row: 0, col: 0 })?.instanceId).toBe(replacement.instanceId);
        expect(session.getHand().some((card) => card.instanceId === handCard.instanceId)).toBe(true);
        expect(session.placeCardFromHand(0, { row: 0, col: 0 })).toBe(true);
    });

    it('swaps board cards without limit', () =>
    {
        const session = new CardGameSession();

        session.placeCardFromHand(0, { row: 0, col: 0 });
        session.placeCardFromHand(0, { row: 0, col: 1 });

        const first = session.board.getCardAt({ row: 0, col: 0 })?.instanceId;
        const second = session.board.getCardAt({ row: 0, col: 1 })?.instanceId;

        expect(session.swapCardsOnBoard({ row: 0, col: 0 }, { row: 0, col: 1 })).toBe(true);
        expect(session.swapCardsOnBoard({ row: 0, col: 0 }, { row: 0, col: 1 })).toBe(true);
        expect(session.board.getCardAt({ row: 0, col: 0 })?.instanceId).toBe(first);
        expect(session.board.getCardAt({ row: 0, col: 1 })?.instanceId).toBe(second);
    });

    it('allows attack when only defend cards are on the board', () =>
    {
        const session = new CardGameSession();

        session.board.placeCard({ row: 0, col: 0 }, createCardInstance('defend', 'right'));

        expect(session.getAttackReadiness().canAttack).toBe(true);
        expect(session.beginAttack()).toEqual({ row: 0, col: 0 });
    });

    it('uses the selected left-column tile as the chain start', () =>
    {
        const session = new CardGameSession();

        session.setChainStartSlot({ row: 2, col: 0 });
        session.board.placeCard({ row: 2, col: 0 }, createCardInstance('attack', 'right'));
        session.board.placeCard({ row: 0, col: 0 }, createCardInstance('attack', 'left'));

        const sequence = session.planAttack();

        expect(sequence?.chain.map((step) => step.slot)).toEqual([ { row: 2, col: 0 } ]);
    });

    it('returns a board card to the hand when removed', () =>
    {
        const session = new CardGameSession();
        const handSize = session.getHand().length;

        session.placeCardFromHand(0, { row: 1, col: 1 });
        const placed = session.board.getCardAt({ row: 1, col: 1 });

        expect(session.removeCardFromBoard({ row: 1, col: 1 })).toBe(true);
        expect(session.board.isEmpty({ row: 1, col: 1 })).toBe(true);
        expect(session.getHand()).toHaveLength(handSize);
        expect(session.getHand().some((card) => card.instanceId === placed?.instanceId)).toBe(true);
    });

    it('starts each fight with three rerolls', () =>
    {
        const session = new CardGameSession();

        expect(session.getRerollsRemaining()).toBe(3);
        expect(session.canReroll()).toBe(true);
    });

    it('rerolls selected hand cards and decrements remaining rerolls', () =>
    {
        const session = new CardGameSession();
        const handBefore = session.getHand().map((card) => card.instanceId);
        const { deckSize, discardSize } = session.getPileCounts();

        expect(session.rerollHandCards([ 0, 2 ])).toBe(true);
        expect(session.getRerollsRemaining()).toBe(2);

        const handAfter = session.getHand().map((card) => card.instanceId);

        expect(handAfter).toHaveLength(handBefore.length);
        expect(handAfter[0]).not.toBe(handBefore[0]);
        expect(handAfter[2]).not.toBe(handBefore[2]);
        expect(handAfter[1]).toBe(handBefore[1]);
        expect(session.getPileCounts()).toEqual({
            deckSize: deckSize - 2,
            discardSize: discardSize + 2,
        });
    });

    it('blocks reroll during attack or when no rerolls remain', () =>
    {
        const session = new CardGameSession();

        session.rerollHandCards([ 0 ]);
        session.rerollHandCards([ 0 ]);
        session.rerollHandCards([ 0 ]);

        expect(session.getRerollsRemaining()).toBe(0);
        expect(session.canReroll()).toBe(false);
        expect(session.rerollHandCards([ 0 ])).toBe(false);

        session.placeCardFromHand(0, { row: 0, col: 0 });
        session.beginAttack();

        expect(session.canReroll()).toBe(false);
        expect(session.rerollHandCards([ 0 ])).toBe(false);
    });

    it('places enemy hazards on empty board slots', () =>
    {
        const session = new CardGameSession();

        const slot = session.placeEnemyHazard();

        expect(slot).not.toBeNull();
        expect(session.board.getCardAt(slot!)).toMatchObject({
            definitionId: 'hazard',
            owner: 'enemy',
        });
    });

    it('prevents moving or removing enemy hazards', () =>
    {
        const session = new CardGameSession();
        const slot = session.placeEnemyHazard()!;

        expect(session.removeCardFromBoard(slot)).toBe(false);
        expect(session.moveCardOnBoard(slot, { row: 0, col: 3 })).toBe(false);
    });

    it('scorches undisarmed trap tiles for the next player turn', () =>
    {
        const session = new CardGameSession();
        const trapSlot = { row: 0, col: 1 };

        session.board.placeCard(trapSlot, createCardInstance('hazard', 'left', 'enemy'));
        session.board.placeCard({ row: 0, col: 0 }, createCardInstance('attack', 'left'));

        const sequence = session.planAttack()!;

        expect(sequence.hazardDamage).toBeGreaterThan(0);
        session.completeAttack(sequence);

        expect(session.isSlotBombDisabled(trapSlot)).toBe(true);
        expect(session.placeCardFromHand(0, trapSlot)).toBe(false);

        session.clearBoard();
        session.completeAttack(emptySequence());

        expect(session.isSlotBombDisabled(trapSlot)).toBe(false);
    });

    it('places a field boost on a random empty slot', () =>
    {
        const session = new CardGameSession();
        const slot = session.placeFieldBoost();

        expect(slot).not.toBeNull();
        expect(session.board.getCardAt(slot!)).toMatchObject({
            definitionId: 'boost',
            owner: 'field',
        });
        expect(getInBoundsDirections(slot!, GRID_CONFIG.rows, GRID_CONFIG.cols))
            .toContain(session.board.getCardAt(slot!)!.arrow);
    });

    it('can place a field boost outside the first row', () =>
    {
        const session = new CardGameSession();

        for (let col = 0; col < GRID_CONFIG.cols; col++)
        {
            session.board.placeCard({ row: 0, col }, createCardInstance('attack', 'right'));
        }

        const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.99);
        const slot = session.placeFieldBoost();
        randomSpy.mockRestore();

        expect(slot).not.toBeNull();
        expect(slot!.row).toBeGreaterThan(0);
    });

    it('can place a field boost on silenced empty tiles', () =>
    {
        const session = new CardGameSession();
        const silencedSlot = { row: 2, col: 1 };

        for (const slot of session.board.slotsInOrder())
        {
            if (slot.row === silencedSlot.row && slot.col === silencedSlot.col)
            {
                continue;
            }

            session.board.placeCard(slot, createCardInstance('attack', 'right'));
        }

        session['silencedSlots'].add(`${silencedSlot.row},${silencedSlot.col}`);

        const slot = session.placeFieldBoost();

        expect(slot).toEqual(silencedSlot);
        expect(session.board.getCardAt(silencedSlot)?.owner).toBe('field');
    });

    it('never assigns off-board arrows to field boosts on corner slots', () =>
    {
        const slot = { row: 0, col: 0 };

        for (let i = 0; i < 50; i++)
        {
            const arrow = randomInBoundsDirectionForPool(
                slot,
                GRID_CONFIG.rows,
                GRID_CONFIG.cols,
                'orthogonal',
            );

            expect(getInBoundsDirections(slot, GRID_CONFIG.rows, GRID_CONFIG.cols)).toContain(arrow);
            expect([ 'up', 'left', 'up-left' ]).not.toContain(arrow);
        }
    });
});
