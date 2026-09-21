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
    tileSize: 96,
    enemyX: 640,
    enemyY: 220,
    enemySize: 120,
    handY: 620,
    handCenterX: 500,
    handCardWidth: 86,
    handCardHeight: 118,
    handCardGap: 14,
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

    it('lays out multiple enemies in a horizontal row', () =>
    {
        const slots = computeEnemySlots(BASE_LAYOUT, 3);

        expect(slots).toHaveLength(3);
        expect(slots[0]!.x).toBe(BASE_LAYOUT.enemyX);
        expect(slots[1]!.x).toBeGreaterThan(slots[0]!.x);
        expect(slots[2]!.x).toBeGreaterThan(slots[1]!.x);
    });
});
