import { describe, expect, it } from 'vitest';
import { getTowerRecruitCost } from './towerRecruitCost';

describe('towerRecruitCost', () =>
{
    it('starter recruit is free', () =>
    {
        expect(getTowerRecruitCost('militia', 0)).toBe(0);
    });

    it('post-wave recruits cost gold by tier', () =>
    {
        expect(getTowerRecruitCost('militia', 1)).toBe(50);
        expect(getTowerRecruitCost('guard', 2)).toBe(85);
    });
});
