import { describe, expect, it, beforeEach } from 'vitest';
import { CARD_DEFINITIONS, GAME_RULES, getCardDefinition } from './cardRegistry';
import { getDefaultCardGameEnemy } from './enemyCatalog';
import { createCardInstance, resetCardInstanceCounter } from '../domain/createCardInstance';
import { CARD_DIRECTIONS } from '../domain/cardDirections';

describe('cardRegistry', () =>
{
    beforeEach(() =>
    {
        resetCardInstanceCounter();
    });

    it('loads card definitions from cards.json', () =>
    {
        expect(CARD_DEFINITIONS).toHaveLength(17);
        expect(getCardDefinition('corner-strike')?.cornerTurn).toBe(true);
        expect(getCardDefinition('corner-defense')?.behaviorId).toBe('defend');
        expect(getCardDefinition('attack')?.arrowPool).toBe('orthogonal');
        expect(getCardDefinition('defend')?.arrowPool).toBe('orthogonal');
        expect(getCardDefinition('attack-special')?.maxChainActivations).toBe(2);
        expect(getCardDefinition('defend-special')?.arrowPool).toBe('diagonal');
        expect(getCardDefinition('joker')?.behaviorId).toBe('joker');
        expect(getCardDefinition('joker')?.chainStepDistance).toBe(2);
        expect(getCardDefinition('loop-reset')?.behaviorId).toBe('loop-reset');
        expect(getCardDefinition('poison')?.chainAbilityIds).toEqual([ 'poison-trail' ]);
        expect(getCardDefinition('fire')?.chainAbilityIds).toEqual([ 'fire-alternation' ]);
        expect(getCardDefinition('hazard')?.behaviorId).toBe('hazard');
        expect(getCardDefinition('boost')?.behaviorId).toBe('boost');
        expect(getCardDefinition('attack-leap')?.chainStepDistance).toBe(2);
        expect(getCardDefinition('defend-leap')?.chainStepDistance).toBe(2);
    });

    it('loads game rules and deck settings', () =>
    {
        expect(GAME_RULES.deckSize).toBe(20);
        expect(GAME_RULES.handSize).toBe(10);
        expect(GAME_RULES.activationStartColumn).toBe(0);
        expect(GAME_RULES.maxChainSteps).toBe(24);
        expect(GAME_RULES.defaultEnemyId).toBe('basic');
        expect(GAME_RULES.player.maxHealth).toBe(80);
        expect(getDefaultCardGameEnemy().maxHealth).toBe(190);
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
