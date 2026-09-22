import { describe, expect, it } from 'vitest';
import { GRID_CONFIG } from '../config/gridConfig';
import { computeBoardLayout, LAYOUT_MIN_TILE, LAYOUT_REF_TILE } from './boardLayout';

describe('boardLayout', () =>
{
    it('centers the 5×5 grid on screen with enemies to the right', () =>
    {
        const layout = computeBoardLayout(1920, 1080);

        expect(layout.tileSize).toBe(LAYOUT_REF_TILE);
        expect(layout.gridWidth).toBe(GRID_CONFIG.cols * layout.tileSize);
        expect(layout.enemyX).toBeGreaterThan(layout.gridOffsetX + layout.gridWidth);
        expect(layout.playerX).toBeLessThan(layout.gridOffsetX);

        const clusterLeft = layout.playerX;
        const clusterRight = layout.enemyX + layout.enemySize;
        const clusterCenter = (clusterLeft + clusterRight) / 2;
        expect(clusterCenter).toBeCloseTo(layout.canvasWidth / 2, -1);
        expect(layout.handY).toBeGreaterThan(layout.gridOffsetY + layout.gridHeight);
        expect(layout.deckX).toBeLessThan(layout.handCenterX);
        expect(layout.graveyardX).toBeGreaterThan(layout.handCenterX);
        expect(layout.graveyardX).toBeGreaterThan(layout.deckX);
        expect(layout.deckY).toBe(layout.graveyardY);
        expect(layout.deckY).toBeGreaterThan(layout.canvasHeight - layout.pileHeight - 40);
    });

    it('packs the board into the left half for loop-split walk map', () =>
    {
        const full = computeBoardLayout(1920, 1080, 'full');
        const split = computeBoardLayout(1920, 1080, 'loop-split');

        expect(split.gridOffsetX).toBeLessThan(full.gridOffsetX);
        expect(split.enemyX + split.enemySize).toBeLessThan(1920 * 0.65);
        expect(split.graveyardX).toBeLessThan(full.graveyardX);
    });

    it('scales the board down at 1280×720 so armor sits above the hand', () =>
    {
        const layout = computeBoardLayout(1280, 720);

        expect(layout.tileSize).toBeLessThan(LAYOUT_REF_TILE);
        expect(layout.tileSize).toBeGreaterThanOrEqual(LAYOUT_MIN_TILE);

        const gridBottom = layout.gridOffsetY + layout.gridHeight;
        const handTop = layout.handY - 8;

        expect(layout.armorY).toBeGreaterThan(gridBottom);
        expect(layout.armorY).toBeLessThan(handTop);
        expect(gridBottom).toBeLessThan(handTop);
        expect(layout.handCardHeight).toBeLessThan(118);
        expect(layout.handCardWidth).toBeLessThan(86);
    });
});
