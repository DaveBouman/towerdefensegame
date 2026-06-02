import { describe, expect, it } from 'vitest';
import { getCumulativeScalingDelta, RACE_BONUS_CONFIG } from './raceBonusCatalog';

describe('raceBonusCatalog', () =>
{
    it('parses specific pair bonuses with target arrays and scaling', () =>
    {
        const juggernautRule = RACE_BONUS_CONFIG.specificPairBonuses.find(
            (rule) => rule.sourceTowerId === 'juggernaut',
        );

        expect(juggernautRule?.targetTowerIds).toEqual([ 'siege', 'militia' ]);
        expect(juggernautRule?.countScaling).toEqual([ 1, 1.5, 1.8 ]);
    });

    it('returns incremental deltas for cumulative scaling curves', () =>
    {
        const scaling = [ 1, 1.5, 1.8 ];

        expect(getCumulativeScalingDelta(scaling, 1)).toBeCloseTo(1);
        expect(getCumulativeScalingDelta(scaling, 2)).toBeCloseTo(0.5);
        expect(getCumulativeScalingDelta(scaling, 3)).toBeCloseTo(0.3);
        expect(getCumulativeScalingDelta(scaling, 4)).toBeCloseTo(0);
    });

    it('falls back to linear scaling when no curve is provided', () =>
    {
        expect(getCumulativeScalingDelta(null, 1)).toBe(1);
        expect(getCumulativeScalingDelta([], 3)).toBe(1);
    });
});
