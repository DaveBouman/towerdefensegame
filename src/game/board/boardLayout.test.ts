import { describe, expect, it } from 'vitest';
import { GRID_CONFIG } from '../config/gridConfig';
import { computeBoardLayout } from './boardLayout';

describe('boardLayout', () =>
{
    it('centers the 5×5 grid on screen with enemies to the right', () =>
    {
        const layout = computeBoardLayout(960, 720);

        expect(layout.gridWidth).toBe(GRID_CONFIG.cols * GRID_CONFIG.tileSize);
        expect(layout.enemyX).toBeGreaterThan(layout.gridOffsetX + layout.gridWidth);
        expect(layout.playerX).toBeLessThan(layout.gridOffsetX);

        const gridCenter = layout.gridOffsetX + layout.gridWidth / 2;
        expect(gridCenter).toBeCloseTo(layout.canvasWidth / 2, 0);
        expect(layout.handY).toBeGreaterThan(layout.gridOffsetY + layout.gridHeight);
        // Piles dock bottom corners (half off-screen), far left / far right.
        expect(layout.deckX).toBeLessThan(layout.handCenterX);
        expect(layout.graveyardX).toBeGreaterThan(layout.handCenterX);
        expect(layout.graveyardX).toBeGreaterThan(layout.deckX);
        expect(layout.deckY).toBe(layout.graveyardY);
        expect(layout.deckY).toBeGreaterThan(layout.canvasHeight - layout.pileHeight - 40);
    });
});
