import { describe, expect, it } from 'vitest';
import {
    computeFusionStatMultipliers,
    getFusionBonusStats,
    getTowerFusionGroupMultiplier,
} from './towerFusionConfig';

describe('towerFusionConfig', () =>
{
    it('scales configured stats for a trio to 3.3×', () =>
    {
        expect(getTowerFusionGroupMultiplier(3)).toBeCloseTo(3.3);

        const militia = computeFusionStatMultipliers('militia', 'close', 3);

        expect(militia.damage).toBeCloseTo(3.3);
        expect(militia.moveSpeedPerTick).toBeUndefined();
    });

    it('uses per-tower fusion stats with archetype fallback', () =>
    {
        expect(getFusionBonusStats('militia', 'close')).toEqual([ 'damage' ]);
        expect(getFusionBonusStats('scout', 'long')).toEqual([ 'moveSpeedPerTick' ]);
        expect(getFusionBonusStats('unknown-tower', 'long')).toEqual([ 'moveSpeedPerTick' ]);
    });

    it('boosts scout move speed instead of damage when fused', () =>
    {
        const scout = computeFusionStatMultipliers('scout', 'long', 3);

        expect(scout.moveSpeedPerTick).toBeCloseTo(3.3);
        expect(scout.damage).toBeUndefined();
    });
});
