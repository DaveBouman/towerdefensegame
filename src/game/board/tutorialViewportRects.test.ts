import { describe, expect, it, vi } from 'vitest';
import {
    clientRectToHostRect,
    phaserBoundsToHostRect,
} from './tutorialViewportRects';

describe('tutorialViewportRects', () =>
{
    it('converts browser client rects into game-viewport local space', () =>
    {
        const hostRect = { left: 100, top: 50, width: 960, height: 540 };
        const clientRect = { left: 180, top: 120, width: 80, height: 80 };

        expect(clientRectToHostRect(clientRect, hostRect)).toEqual({
            x: 80,
            y: 70,
            width: 80,
            height: 80,
        });
    });

    it('maps phaser canvas bounds through scale and host offset', () =>
    {
        vi.stubGlobal('document', {
            getElementById: () => ({
                getBoundingClientRect: () => ({ left: 100, top: 50, width: 960, height: 540 }),
            }),
        });

        const canvas = {
            getBoundingClientRect: () => ({ left: 100, top: 50, width: 960, height: 540 }),
        } as HTMLCanvasElement;

        const bounds = {
            x: 200,
            y: 120,
            width: 64,
            height: 64,
        } as Phaser.Geom.Rectangle;

        expect(phaserBoundsToHostRect(bounds, canvas, 960, 540)).toEqual({
            x: 200,
            y: 120,
            width: 64,
            height: 64,
        });

        vi.unstubAllGlobals();
    });
});
