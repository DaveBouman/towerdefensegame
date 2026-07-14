import { describe, expect, it } from 'vitest';
import { getMarkSevenProgress, isSeventhStrikeAttack, SEVENTH_STRIKE_INTERVAL } from './bodyMods';

describe('isSeventhStrikeAttack', () =>
{
    it('triggers on every seventh attack number', () =>
    {
        expect(SEVENTH_STRIKE_INTERVAL).toBe(7);

        for (let attack = 1; attack <= 21; attack++)
        {
            expect(isSeventhStrikeAttack(attack)).toBe(attack % 7 === 0);
        }
    });
});

describe('getMarkSevenProgress', () =>
{
    it('counts attacks toward the next proc within each cycle', () =>
    {
        expect(getMarkSevenProgress(0)).toEqual({
            attacksInCycle: 0,
            interval: 7,
            nextAttackIsProc: false,
        });
        expect(getMarkSevenProgress(6)).toEqual({
            attacksInCycle: 6,
            interval: 7,
            nextAttackIsProc: true,
        });
        expect(getMarkSevenProgress(7)).toEqual({
            attacksInCycle: 0,
            interval: 7,
            nextAttackIsProc: false,
        });
        expect(getMarkSevenProgress(13)).toEqual({
            attacksInCycle: 6,
            interval: 7,
            nextAttackIsProc: true,
        });
    });
});
