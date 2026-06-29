import { describe, expect, it } from 'vitest';
import { GRID_CONFIG } from '../config/gridConfig';
import { computeBoardLayout } from './boardLayout';

describe('boardLayout', () =>
{
    it('places the grid left of center with the enemy to its right', () =>
    {
        const layout = computeBoardLayout(960, 540);

        expect(layout.gridWidth).toBe(GRID_CONFIG.cols * GRID_CONFIG.tileSize);
        expect(layout.enemyX).toBeGreaterThan(layout.gridOffsetX + layout.gridWidth);
        expect(layout.gridOffsetX).toBeLessThan((layout.canvasWidth - layout.gridWidth) / 2);
        expect(layout.handY).toBeGreaterThan(layout.gridOffsetY + layout.gridHeight);
    });
});
