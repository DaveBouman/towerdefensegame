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
    abilityPoisonStacks: 0,
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

    it('grants chain armor mid-attack so thorns can be blocked by earlier defend steps', () =>
    {
        const session = new CardGameSession('thornward');

        session.beginAttack();
        session.grantPlayerShield(5);
        const result = session.dealAttackDamage(10);

        expect(result.thornsDamage).toBe(4);
        expect(session.getPlayer().shield).toBe(1);
        expect(session.getPlayer().health).toBe(GAME_RULES.player.maxHealth);
    });

    it('does not double-apply armor granted during the chain when completing the attack', () =>
    {
        const session = new CardGameSession();

        session.beginAttack();
        session.grantPlayerShield(3);
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

    it('prefers to place enemy hazards away from existing traps', () =>
    {
        const session = new CardGameSession();

        session.board.clear();
        session.board.placeCard({ row: 0, col: 0 }, createCardInstance('hazard', 'right', 'enemy'));

        // Leave one empty tile adjacent to the trap and one far away; fill the rest.
        for (const slot of session.board.slotsInOrder())
        {
            const isHazard = slot.row === 0 && slot.col === 0;
            const leaveEmpty = (slot.row === 0 && slot.col === 1) || (slot.row === 3 && slot.col === 3);

            if (isHazard || leaveEmpty)
            {
                continue;
            }

            session.board.placeCard(slot, createCardInstance('attack', 'right'));
        }

        const slot = session.placeEnemyHazard();

        expect(slot).toEqual({ row: 3, col: 3 });
    });

    it('activates and expires the enemy Dead Zone field', () =>
    {
        const session = new CardGameSession('smokebinder');

        expect(session.getDampenField()).toBeNull();
        expect(session.getDampenedSlots()).toEqual([]);

        const field = session.activateDampenField();

        expect(field).toEqual({ parity: 'even', multiplier: 0.5 });
        expect(session.getDampenField()).toEqual({ parity: 'even', multiplier: 0.5 });
        // Half of a 4x4 board are even (row + col) tiles.
        expect(session.getDampenedSlots()).toHaveLength(8);

        // The field lasts one player turn, then expires when the turn ends.
        session.tickDampenField();

        expect(session.getDampenField()).toBeNull();
        expect(session.getDampenedSlots()).toEqual([]);
    });

    it('starts the fight with a full energy pool', () =>
    {
        const session = new CardGameSession();

        expect(session.getMaxEnergy()).toBe(GAME_RULES.energyPerTurn);
        expect(session.getEnergy()).toBe(GAME_RULES.energyPerTurn);
        expect(session.hasEnergy()).toBe(true);
    });

    it('spends energy and blocks attacking once it runs out', () =>
    {
        const session = new CardGameSession();

        session.board.placeCard({ row: 0, col: 0 }, createCardInstance('attack', 'right'));

        for (let i = 0; i < GAME_RULES.energyPerTurn; i++)
        {
            expect(session.getAttackReadiness().canAttack).toBe(true);
            expect(session.spendEnergy()).toBe(true);
        }

        expect(session.getEnergy()).toBe(0);
        expect(session.spendEnergy()).toBe(false);
        expect(session.getAttackReadiness()).toEqual({ canAttack: false, reason: 'no-energy' });
    });

    it('refills the hand up to the hand size without discarding held cards', () =>
    {
        const session = new CardGameSession();

        session.placeCardFromHand(0, { row: 0, col: 0 });
        session.placeCardFromHand(0, { row: 1, col: 0 });

        expect(session.getHand()).toHaveLength(GAME_RULES.handSize - 2);

        session.refillHand();

        expect(session.getHand()).toHaveLength(GAME_RULES.handSize);
    });

    it('resets energy only after all attacks in a round are spent', () =>
    {
        const session = new CardGameSession();

        session.spendEnergy();
        expect(session.getEnergy()).toBe(GAME_RULES.energyPerTurn - 1);

        const action = session.beginEnemyTurn();

        if (action)
        {
            session.completeEnemyTurn(action);
        }

        expect(session.getEnergy()).toBe(GAME_RULES.energyPerTurn - 1);

        session.spendEnergy();
        session.spendEnergy();
        expect(session.getEnergy()).toBe(0);

        const action2 = session.beginEnemyTurn();

        if (action2)
        {
            session.completeEnemyTurn(action2);
        }

        expect(session.getEnergy()).toBe(GAME_RULES.energyPerTurn);
    });

    it('ramps enemy damage with each extra attack in a round', () =>
    {
        const session = new CardGameSession();
        const perAttack = GAME_RULES.enemyDamageRampPerAttack;

        expect(session.getAttacksThisRound()).toBe(0);
        expect(session.getEnemyDamageRamp()).toBe(0);

        session.spendEnergy();
        expect(session.getAttacksThisRound()).toBe(1);
        // The first attack of a round is baseline — no ramp yet.
        expect(session.getEnemyDamageRamp()).toBe(0);

        session.spendEnergy();
        expect(session.getEnemyDamageRamp()).toBe(perAttack);

        session.spendEnergy();
        expect(session.getEnemyDamageRamp()).toBe(perAttack * 2);
    });

    it('bakes the round ramp into a scaled attack intent', () =>
    {
        const session = new CardGameSession();
        const perAttack = GAME_RULES.enemyDamageRampPerAttack;

        // Force a known attack intent so the ramp is deterministic.
        (session as unknown as { queuedEnemyTurn: unknown }).queuedEnemyTurn = {
            enemyId: 'basic',
            steps: [ { kind: 'attack', amount: 10 } ],
        };

        session.spendEnergy();
        session.spendEnergy();

        const scaled = session.getScaledEnemyIntent();

        expect(scaled?.steps[0]).toEqual({ kind: 'attack', amount: 10 + perAttack });
    });

    it('rejects unplayable curse cards from hand placement', () =>
    {
        const session = new CardGameSession();

        session.addCardToHand('burden', true);

        const burdenIndex = session.getHand().findIndex((card) => card.definitionId === 'burden');

        expect(burdenIndex).toBeGreaterThanOrEqual(0);
        expect(session.placeCardFromHand(burdenIndex, { row: 0, col: 1 })).toBe(false);
    });

    it('allows fuse to be placed but punishes leaving it in hand at turn end', () =>
    {
        const session = new CardGameSession();
        const healthBefore = session.getPlayer().health;

        session.addCardToHand('fuse', true);

        const fuseIndex = session.getHand().findIndex((card) => card.definitionId === 'fuse');

        expect(session.placeCardFromHand(fuseIndex, { row: 0, col: 1 })).toBe(true);

        session.addCardToHand('fuse', true);
        const penalty = session.resolveHandEndPenalties();

        expect(penalty.totalDamage).toBe(8);
        expect(penalty.penalizedCards).toEqual([ { definitionId: 'fuse', damage: 8 } ]);
        expect(session.getPlayer().health).toBe(healthBefore - 8);
    });

    it('adds curse cards to the hand after an enemy turn when the passive is active', () =>
    {
        const session = new CardGameSession('saboteur');
        const action = session.beginEnemyTurn();

        expect(action).not.toBeNull();

        session.completeEnemyTurn(action!);

        expect(session.getHand().some((card) => card.definitionId === 'burden')).toBe(true);
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

describe('CardGameSession courier discard', () =>
{
    beforeEach(() =>
    {
        resetCardInstanceCounter();
    });

    const puzzleSession = (handCards: { definitionId: string; arrow: 'right' }[]) =>
        new CardGameSession('training-dummy', undefined, undefined, [], { handCards });

    it('discards two cards from the left of hand when courier is played', () =>
    {
        const session = puzzleSession([
            { definitionId: 'courier', arrow: 'right' },
            { definitionId: 'attack', arrow: 'right' },
            { definitionId: 'defend', arrow: 'right' },
            { definitionId: 'attack', arrow: 'right' },
        ]);

        expect(session.placeCardFromHand(0, { row: 0, col: 0 })).toBe(true);

        expect(session.board.getCardAt({ row: 0, col: 0 })?.definitionId).toBe('courier');
        expect(session.board.getCardAt({ row: 0, col: 1 })).toBeNull();
        expect(session.getHand()).toHaveLength(1);
        expect(session.getHand()[0]?.definitionId).toBe('attack');
        expect(session.getDiscardDefinitionIds()).toEqual([ 'attack', 'defend' ]);
    });

    it('discards only remaining hand cards when fewer than two are available', () =>
    {
        const session = puzzleSession([
            { definitionId: 'courier', arrow: 'right' },
            { definitionId: 'attack', arrow: 'right' },
        ]);

        expect(session.placeCardFromHand(0, { row: 0, col: 0 })).toBe(true);

        expect(session.getDiscardDefinitionIds()).toEqual([ 'attack' ]);
        expect(session.getHand()).toHaveLength(0);
    });

    it('discards unplayable curse cards from the left of hand', () =>
    {
        const session = puzzleSession([
            { definitionId: 'courier', arrow: 'right' },
            { definitionId: 'burden', arrow: 'right' },
            { definitionId: 'defend', arrow: 'right' },
        ]);

        expect(session.placeCardFromHand(0, { row: 0, col: 0 })).toBe(true);

        expect(session.getDiscardDefinitionIds()).toEqual([ 'burden', 'defend' ]);
        expect(session.getHand()).toHaveLength(0);
    });

    it('marks courier as exhausted and omits it from the graveyard when the board clears', () =>
    {
        const session = puzzleSession([
            { definitionId: 'courier', arrow: 'right' },
            { definitionId: 'attack', arrow: 'right' },
        ]);

        expect(session.placeCardFromHand(0, { row: 0, col: 0 })).toBe(true);
        expect(session.getExhaustedDefinitionIds()).toEqual([ 'courier' ]);
        expect(session.board.getCardAt({ row: 0, col: 0 })?.exhausted).toBe(true);

        session.clearBoard();

        expect(session.getDiscardDefinitionIds()).toEqual([ 'attack' ]);
        expect(session.getExhaustedDefinitionIds()).toEqual([ 'courier' ]);
    });

    it('prevents an exhausted card from being played again from hand', () =>
    {
        const session = puzzleSession([
            { definitionId: 'courier', arrow: 'right' },
        ]);

        session.placeCardFromHand(0, { row: 0, col: 0 });
        session.removeCardFromBoard({ row: 0, col: 0 });

        expect(session.getHand()).toHaveLength(1);
        expect(session.placeCardFromHand(0, { row: 0, col: 1 })).toBe(false);
    });
});
