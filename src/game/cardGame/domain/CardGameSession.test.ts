import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../events/CardGameEventBus', () => ({
    CardGameEventBus: {
        emit: vi.fn(),
        on: vi.fn(),
        off: vi.fn(),
    },
}));

import { GAME_RULES } from '../config/cardRegistry';
import { CardGameSession } from './CardGameSession';
import { createCardInstance, resetCardInstanceCounter } from './createCardInstance';
import type { AttackSequence } from './types';

const emptySequence = (): AttackSequence => ({
    chain: [],
    steps: [],
    totalDamage: 0,
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

    it('renews the whole hand after enemy turn', () =>
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
        expect(session.getHand().map((card) => card.instanceId))
            .not.toEqual(originalHand);
        expect(session.getDiscardSize()).toBe(GAME_RULES.handSize);
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
        expect(session.getPlayer().health).toBe(19);
    });

    it('absorbs player damage with enemy shield first', () =>
    {
        const session = new CardGameSession();

        session.resolveEnemyShield(5);
        const result = session.dealAttackDamage(8);

        expect(result.shieldAbsorbed).toBe(5);
        expect(result.healthDamage).toBe(3);
        expect(result.enemy.shield).toBe(0);
        expect(result.enemy.health).toBe(27);
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

    it('clears shield when the hand is renewed', () =>
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

        if (action?.kind === 'shield')
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
        expect(session.beginAttack()?.totalDamage).toBe(0);
    });

    it('uses the selected left-column tile as the chain start', () =>
    {
        const session = new CardGameSession();

        session.setChainStartSlot({ row: 2, col: 0 });
        session.placeCardFromHand(0, { row: 2, col: 0 });
        session.placeCardFromHand(0, { row: 0, col: 0 });

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
});
