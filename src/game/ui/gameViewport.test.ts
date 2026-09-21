import { describe, expect, it } from 'vitest';
import { computeUiScale, GAME_UI_REF_HEIGHT } from './gameViewport';

describe('computeUiScale', () =>
{
    it('is 1 at the reference height', () =>
    {
        expect(computeUiScale(GAME_UI_REF_HEIGHT)).toBe(1);
    });

    it('scales down on shorter viewports and up on taller ones within clamps', () =>
    {
        expect(computeUiScale(540)).toBeCloseTo(0.75, 5);
        expect(computeUiScale(360)).toBe(0.7);
        expect(computeUiScale(1080)).toBeCloseTo(1.2, 5);
        expect(computeUiScale(1440)).toBe(1.2);
    });
});
