import { describe, expect, it } from 'vitest';
import { getKillExperience, getWaveBonusExperience } from './towerExperienceConfig';

describe('towerExperienceConfig', () =>
{
    it('kill EXP grows with wave', () =>
    {
        expect(getKillExperience(20, 1)).toBe(22);
        expect(getKillExperience(20, 5)).toBeGreaterThan(getKillExperience(20, 1));
        expect(getKillExperience(20, 10)).toBeGreaterThan(getKillExperience(20, 5));
    });

    it('wave bonus EXP is exponential for catch-up', () =>
    {
        expect(getWaveBonusExperience(1)).toBe(30);
        expect(getWaveBonusExperience(5)).toBeGreaterThan(100);
        expect(getWaveBonusExperience(10)).toBeGreaterThan(getWaveBonusExperience(5) * 2);
    });
});
