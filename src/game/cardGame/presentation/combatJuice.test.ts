import { describe, expect, it } from 'vitest';
import {
    getBigMomentHoldMs,
    getCameraShakeParams,
    getChainGapMs,
    getChainPaceMultiplier,
    getDamageTierStyle,
    getIntentThreatLevel,
    isHighThreatIntent,
} from './combatJuice';

describe('combatJuice', () =>
{
    it('scales damage number presentation by tier', () =>
    {
        expect(getDamageTierStyle(5).fontSize).toBe(24);
        expect(getDamageTierStyle(12).fontSize).toBe(28);
        expect(getDamageTierStyle(25).fontSize).toBe(32);
        expect(getDamageTierStyle(50).hitstopMs).toBeGreaterThan(0);
        expect(getDamageTierStyle(5).shakeIntensity).toBeGreaterThan(0);
        expect(getDamageTierStyle(25).shakeIntensity).toBeGreaterThan(
            getDamageTierStyle(5).shakeIntensity,
        );
    });

    it('maps shake intensity to readable camera params', () =>
    {
        expect(getCameraShakeParams(0)).toEqual({ duration: 0, intensity: 0 });
        expect(getCameraShakeParams(0.005).intensity).toBe(0.005);
        expect(getCameraShakeParams(0.024).duration).toBeGreaterThan(200);
    });

    it('accelerates later chain steps gently and holds on big moments', () =>
    {
        expect(getChainPaceMultiplier(0)).toBe(1);
        expect(getChainPaceMultiplier(5)).toBeLessThan(getChainPaceMultiplier(1));
        expect(getChainPaceMultiplier(5)).toBeGreaterThan(0.62);
        expect(getChainPaceMultiplier(20)).toBe(0.62);
        expect(getChainGapMs(620)).toBeLessThanOrEqual(72);
        expect(getChainGapMs(620)).toBeGreaterThanOrEqual(24);
        expect(getBigMomentHoldMs({ killed: true })).toBeGreaterThan(
            getBigMomentHoldMs({ damage: 12 }),
        );
        expect(getBigMomentHoldMs({ abilityDetonation: true })).toBeGreaterThan(0);
        expect(getBigMomentHoldMs({ damage: 4 })).toBe(0);
    });

    it('flags high-threat enemy intents', () =>
    {
        expect(getIntentThreatLevel({
            steps: [ { kind: 'attack', amount: 16 } ],
        })).toBe(16);
        expect(isHighThreatIntent(16)).toBe(true);
        expect(isHighThreatIntent(8)).toBe(false);
    });
});
