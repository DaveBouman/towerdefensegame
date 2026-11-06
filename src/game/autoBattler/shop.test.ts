import { describe, expect, it, beforeEach } from 'vitest';
import { AUTO_BATTLER_RULES } from './config/rules';
import {
    buyOffer,
    moveTeamUnit,
    rerollShop,
    sellTeamUnit,
    startNewRunShop,
    toggleFreezeOffer,
} from './shop';
import { resetAutoBattlerUidCounter } from './unitRegistry';

describe('autoBattler shop', () =>
{
    beforeEach(() =>
    {
        resetAutoBattlerUidCounter();
    });

    it('starts a run shop with gold and offers', () =>
    {
        const state = startNewRunShop('SHOPSEED');

        expect(state.gold).toBe(AUTO_BATTLER_RULES.goldPerTurn);
        expect(state.offers).toHaveLength(AUTO_BATTLER_RULES.shopSize);
        expect(state.lives).toBe(AUTO_BATTLER_RULES.startingLives);
        expect(state.team.filter(Boolean)).toHaveLength(0);
    });

    it('buys into the first empty slot', () =>
    {
        let state = startNewRunShop('BUYSEED');
        const offerUid = state.offers[0]!.uid;
        const definitionId = state.offers[0]!.definitionId;
        state = buyOffer(state, offerUid)!;

        expect(state.gold).toBe(AUTO_BATTLER_RULES.goldPerTurn - AUTO_BATTLER_RULES.buyCost);
        expect(state.team[0]?.definitionId).toBe(definitionId);
        expect(state.offers).toHaveLength(AUTO_BATTLER_RULES.shopSize - 1);
    });

    it('sells a team unit for gold', () =>
    {
        let state = startNewRunShop('SELLSEED');
        state = buyOffer(state, state.offers[0]!.uid)!;
        const uid = state.team[0]!.uid;
        const goldBefore = state.gold;
        state = sellTeamUnit(state, uid)!;

        expect(state.team[0]).toBeNull();
        expect(state.gold).toBe(goldBefore + AUTO_BATTLER_RULES.sellReward);
    });

    it('keeps frozen offers across reroll', () =>
    {
        let state = startNewRunShop('FREEZESEED');
        const frozenUid = state.offers[0]!.uid;
        state = toggleFreezeOffer(state, frozenUid)!;
        expect(state.offers[0]?.frozen).toBe(true);
        state = rerollShop(state, 'FREEZESEED')!;

        expect(state.offers.some((offer) => offer.uid === frozenUid && offer.frozen)).toBe(true);
        expect(state.offers).toHaveLength(AUTO_BATTLER_RULES.shopSize);
    });

    it('swaps team slots', () =>
    {
        let state = startNewRunShop('MOVESEED');
        state = buyOffer(state, state.offers[0]!.uid)!;
        state = buyOffer(state, state.offers[0]!.uid)!;
        const front = state.team[0]!.uid;
        const second = state.team[1]!.uid;
        state = moveTeamUnit(state, 0, 1)!;

        expect(state.team[0]?.uid).toBe(second);
        expect(state.team[1]?.uid).toBe(front);
    });
});
