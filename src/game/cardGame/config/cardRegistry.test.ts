import { describe, expect, it, beforeEach } from 'vitest';
import { CARD_DEFINITIONS, GAME_RULES, getCardDefinition } from './cardRegistry';
import { createCardInstance, resetCardInstanceCounter } from '../domain/createCardInstance';

describe('cardRegistry', () =>
{
    beforeEach(() =>
    {
        resetCardInstanceCounter();
    });

    it('loads card definitions from cards.json', () =>
    {
        expect(CARD_DEFINITIONS).toHaveLength(9);
        expect(getCardDefinition('atk-right')?.behaviorId).toBe('attack');
        expect(getCardDefinition('atk-right')?.arrow).toBe('right');
        expect(getCardDefinition('def-down')?.behaviorId).toBe('defend');
        expect(getCardDefinition('def-down')?.arrow).toBe('down');
    });

    it('loads game rules and starting hand', () =>
    {
        expect(GAME_RULES.startingHand).toEqual([ 'atk-right', 'def-down', 'atk-right' ]);
        expect(GAME_RULES.activationStart).toEqual({ row: 0, col: 0 });
        expect(GAME_RULES.enemy.maxHealth).toBeGreaterThan(0);
    });

    it('creates unique card instances', () =>
    {
        const a = createCardInstance('atk-right');
        const b = createCardInstance('atk-right');

        expect(a.instanceId).not.toBe(b.instanceId);
        expect(a.definitionId).toBe('atk-right');
    });
});
