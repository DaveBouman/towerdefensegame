import { describe, expect, it } from 'vitest';
import {
    getBigMomentHoldMs,
    getChainGapMs,
    getChainPaceMultiplier,
    getChainStepMs,
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
    });

    it('varies chain step timing by behavior', () =>
    {
        expect(getChainStepMs('attack', 800)).toBeLessThan(800);
        expect(getChainStepMs('defend', 800)).toBeGreaterThan(800);
    });

    it('accelerates later chain steps and holds on big moments', () =>
    {
        expect(getChainPaceMultiplier(0)).toBe(1);
        expect(getChainPaceMultiplier(5)).toBeLessThan(getChainPaceMultiplier(1));
        expect(getChainPaceMultiplier(20)).toBe(0.46);
        expect(getChainGapMs(480)).toBeLessThanOrEqual(40);
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
