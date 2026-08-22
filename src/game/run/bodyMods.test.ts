import { describe, expect, it } from 'vitest';
import {
    BODY_MOD_IDS,
    FIFTH_STRIKE_INTERVAL,
    getIntervalStrikeProgress,
    isFifthStrikeAttack,
    isIntervalStrikeAttack,
    isSeventhStrikeAttack,
    SEVENTH_STRIKE_INTERVAL,
} from './bodyMods';

describe('isIntervalStrikeAttack', () =>
{
    it('triggers on every Nth attack number', () =>
    {
        for (let attack = 1; attack <= 21; attack++)
        {
            expect(isIntervalStrikeAttack(attack, 5)).toBe(attack % 5 === 0);
            expect(isIntervalStrikeAttack(attack, 7)).toBe(attack % 7 === 0);
        }
    });
});

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

describe('isFifthStrikeAttack', () =>
{
    it('triggers on every fifth attack number', () =>
    {
        expect(FIFTH_STRIKE_INTERVAL).toBe(5);

        for (let attack = 1; attack <= 20; attack++)
        {
            expect(isFifthStrikeAttack(attack)).toBe(attack % 5 === 0);
        }
    });
});

describe('getIntervalStrikeProgress', () =>
{
    it('counts attacks toward the next proc within each cycle', () =>
    {
        expect(getIntervalStrikeProgress(0, 5)).toEqual({
            attacksInCycle: 0,
            interval: 5,
            nextAttackIsProc: false,
        });
        expect(getIntervalStrikeProgress(4, 5)).toEqual({
            attacksInCycle: 4,
            interval: 5,
            nextAttackIsProc: true,
        });
        expect(getIntervalStrikeProgress(5, 5)).toEqual({
            attacksInCycle: 0,
            interval: 5,
            nextAttackIsProc: false,
        });
    });
});

describe('interval strike helpers', () =>
{
    it('counts attacks toward the next Mark VII proc within each cycle', () =>
    {
        expect(getIntervalStrikeProgress(6, SEVENTH_STRIKE_INTERVAL)).toEqual({
            attacksInCycle: 6,
            interval: 7,
            nextAttackIsProc: true,
        });
    });

    it('counts attacks toward the next Mark V proc within each cycle', () =>
    {
        expect(getIntervalStrikeProgress(4, FIFTH_STRIKE_INTERVAL)).toEqual({
            attacksInCycle: 4,
            interval: 5,
            nextAttackIsProc: true,
        });
    });
});

describe('interval strike body mod ids', () =>
{
    it('maps proc mods to intervals', () =>
    {
        expect(BODY_MOD_IDS.markFive).toBe('mark-five');
        expect(BODY_MOD_IDS.portsideGyro).toBe('portside-gyro');
        expect(BODY_MOD_IDS.capacitorBank).toBe('capacitor-bank');
    });
});
