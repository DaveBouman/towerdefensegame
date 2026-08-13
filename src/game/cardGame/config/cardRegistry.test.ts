import { describe, expect, it, beforeEach } from 'vitest';
import {
    CARD_DEFINITIONS,
    GAME_RULES,
    canUpgradeCard,
    getCardDefinition,
    upgradedCardId,
} from './cardRegistry';
import { getDefaultCardGameEnemy } from './enemyCatalog';
import { createCardInstance, resetCardInstanceCounter } from '../domain/createCardInstance';
import { CARD_DIRECTIONS } from '../domain/cardDirections';

describe('cardRegistry', () =>
{
    beforeEach(() =>
    {
        resetCardInstanceCounter();
    });

    it('loads card definitions and materializes upgrades', () =>
    {
        expect(CARD_DEFINITIONS.length).toBeGreaterThanOrEqual(70);
        expect(getCardDefinition('attack')?.tier).toBe(1);
        expect(getCardDefinition('attack')?.upgradesTo).toBe(upgradedCardId('attack'));
        expect(getCardDefinition(upgradedCardId('attack'))?.power).toBe(8);
        expect(getCardDefinition(upgradedCardId('attack'))?.upgradeOf).toBe('attack');
        expect(getCardDefinition('execution')?.tier).toBe(3);
        expect(canUpgradeCard('burden')).toBe(false);
        expect(getCardDefinition('corner-strike')?.cornerTurn).toBe(true);
        expect(getCardDefinition('phase-relay')?.wrapEdges).toBe(true);
        expect(getCardDefinition('poison')?.chainAbilityIds).toEqual([ 'poison-trail' ]);
        expect(getCardDefinition('black-ichor')?.behaviorId).toBe('poison');
    });

    it('loads game rules and deck settings', () =>
    {
        expect(GAME_RULES.deckSize).toBe(20);
        expect(GAME_RULES.handSize).toBe(8);
        expect(GAME_RULES.activationStartColumn).toBe(0);
        expect(GAME_RULES.maxChainSteps).toBe(24);
        expect(GAME_RULES.defaultEnemyId).toBe('basic');
        expect(GAME_RULES.player.maxHealth).toBe(80);
        expect(getDefaultCardGameEnemy().maxHealth).toBe(40);
        expect(getDefaultCardGameEnemy().attackDamage).toBe(13);
        expect(getDefaultCardGameEnemy().shieldGain).toBe(13);
    });

    it('creates unique card instances with pool-based arrows', () =>
    {
        const a = createCardInstance('attack', 'up');
        const b = createCardInstance('attack-special', 'down-right');

        expect(a.instanceId).not.toBe(b.instanceId);
        expect(a.definitionId).toBe('attack');
        expect(a.arrow).toBe('up');
        expect(b.arrow).toBe('down-right');
        expect(CARD_DIRECTIONS).toHaveLength(8);
    });
});
