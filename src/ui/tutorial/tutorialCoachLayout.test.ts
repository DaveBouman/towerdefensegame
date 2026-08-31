import { describe, expect, it } from 'vitest';
import { normalizeHighlightRect } from '../../game/board/tutorialViewportRects';
import { pickBubblePosition } from './tutorialCoachLayout';

const HOST = { width: 1280, height: 720 };

describe('tutorialCoachLayout', () =>
{
    it('expands small highlight rects for visibility', () =>
    {
        expect(normalizeHighlightRect({ x: 100, y: 100, width: 20, height: 20 }, 56, 8)).toEqual({
            x: 82,
            y: 82,
            width: 56,
            height: 56,
        });
    });

    it('keeps the bubble away from upper targets', () =>
    {
        const target = { x: 100, y: 120, width: 80, height: 80 };
        const placement = pickBubblePosition(target, 320, 180, HOST);

        expect(placement.top).toBeGreaterThan(target.y + target.height);
    });
});
