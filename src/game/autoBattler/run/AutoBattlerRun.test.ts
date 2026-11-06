import { describe, expect, it, beforeEach } from 'vitest';
import { resetAutoBattlerUidCounter } from '../unitRegistry';
import {
    applyBuy,
    endTurnAndBattle,
    finishBattle,
    startRun,
} from './AutoBattlerRun';

describe('AutoBattlerRun', () =>
{
    beforeEach(() =>
    {
        resetAutoBattlerUidCounter();
    });

    it('runs shop → battle → shop for a win or loss', () =>
    {
        let state = startRun('RUNSEED');
        expect(state.phase).toBe('shop');

        if (state.player.offers[0])
        {
            state = applyBuy(state, state.player.offers[0].uid);
        }

        state = endTurnAndBattle(state);
        expect(state.phase).toBe('battle');
        expect(state.battle).not.toBeNull();

        state = finishBattle(state);
        expect([ 'shop', 'victory', 'defeat' ]).toContain(state.phase);
    });
});
