import { describe, expect, it } from 'vitest';
import {
    GAME_ASPECT,
    GAME_MIN_HEIGHT,
    GAME_MIN_WIDTH,
    computeViewportSize,
} from './gameViewport';

describe('gameViewport', () =>
{
    it('keeps a 16:9 frame on ultrawide windows', () =>
    {
        const size = computeViewportSize(2560, 1080);

        expect(size.width / size.height).toBeCloseTo(GAME_ASPECT, 2);
        expect(size.height).toBe(1080);
        expect(size.width).toBe(Math.round(1080 * GAME_ASPECT));
    });

    it('keeps a 16:9 frame on tall windows', () =>
    {
        const size = computeViewportSize(1080, 1920);

        expect(size.width / size.height).toBeCloseTo(GAME_ASPECT, 2);
        expect(size.width).toBe(1080);
        expect(size.height).toBe(Math.round(1080 / GAME_ASPECT));
    });

    it('uses the full window at exactly 16:9', () =>
    {
        expect(computeViewportSize(1280, 720)).toEqual({ width: 1280, height: 720 });
    });

    it('documents the desktop minimum size', () =>
    {
        expect(GAME_MIN_WIDTH / GAME_MIN_HEIGHT).toBeCloseTo(GAME_ASPECT, 5);
    });
});
