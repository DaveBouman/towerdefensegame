import { describe, expect, it } from 'vitest';
import { WHEEL_SEGMENTS } from './runEvents';
import {
    buildWheelConicGradient,
    getWheelBadLuckVisualShare,
    getWheelDisplayLayout,
    getWheelSpinRotationTarget,
} from './wheelDisplay';

describe('wheelDisplay', () =>
{
    it('uses skewed visual slices that still cover the full wheel', () =>
    {
        const layout = getWheelDisplayLayout();

        expect(layout).toHaveLength(WHEEL_SEGMENTS.length);
        expect(layout[0]?.startAngle).toBe(0);
        expect(layout.at(-1)?.endAngle).toBe(360);
        expect(layout.reduce((sum, segment) => sum + segment.visualDegrees, 0)).toBe(360);
    });

    it('makes curse slices look larger than fair odds', () =>
    {
        const layout = getWheelDisplayLayout();
        const badShare = getWheelBadLuckVisualShare();
        const fairShare = layout.filter((segment) => segment.tone === 'bad').length / layout.length;

        expect(badShare).toBeGreaterThan(fairShare);
        expect(buildWheelConicGradient()).toContain('conic-gradient');
    });

    it('targets spin rotation from visual mid-angles', () =>
    {
        const layout = getWheelDisplayLayout();

        for (const segment of layout)
        {
            const rotation = getWheelSpinRotationTarget(segment.index);

            expect(rotation % 360).toBeCloseTo(360 - segment.midAngle, 5);
        }
    });
});
