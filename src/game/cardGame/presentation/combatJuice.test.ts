import { describe, expect, it } from 'vitest';
import {
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

    it('flags high-threat enemy intents', () =>
    {
        expect(getIntentThreatLevel({
            steps: [ { kind: 'attack', amount: 16 } ],
        })).toBe(16);
        expect(isHighThreatIntent(16)).toBe(true);
        expect(isHighThreatIntent(8)).toBe(false);
    });
});
