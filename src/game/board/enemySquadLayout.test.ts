import { describe, expect, it } from 'vitest';
import type { BoardLayout } from './boardLayout';
import { computeEnemySlots } from './enemySquadLayout';

const BASE_LAYOUT: BoardLayout = {
    canvasWidth: 1280,
    canvasHeight: 720,
    gridOffsetX: 200,
    gridOffsetY: 80,
    gridWidth: 400,
    gridHeight: 400,
    tileSize: 80,
    enemyX: 640,
    enemyY: 220,
    enemySize: 120,
    handY: 620,
    handCenterX: 500,
    armorX: 400,
    armorY: 500,
    playerX: 60,
    playerY: 220,
    playerSize: 110,
    deckX: 48,
    deckY: 500,
    graveyardX: 1100,
    graveyardY: 500,
    pileWidth: 64,
    pileHeight: 88,
};

describe('computeEnemySlots', () =>
{
    it('returns a single slot at the default enemy anchor', () =>
    {
        const [ slot ] = computeEnemySlots(BASE_LAYOUT, 1);

        expect(slot).toEqual({
            x: BASE_LAYOUT.enemyX,
            y: BASE_LAYOUT.enemyY,
            size: BASE_LAYOUT.enemySize,
        });
    });

    it('lays out multiple enemies left to right on one row', () =>
    {
        const slots = computeEnemySlots(BASE_LAYOUT, 3);

        expect(slots).toHaveLength(3);
        expect(slots[0]!.x).toBe(BASE_LAYOUT.enemyX);
        expect(slots[0]!.y).toBe(slots[1]!.y);
        expect(slots[1]!.y).toBe(slots[2]!.y);
        expect(slots[0]!.x).toBeLessThan(slots[1]!.x);
        expect(slots[1]!.x).toBeLessThan(slots[2]!.x);
    });
});
