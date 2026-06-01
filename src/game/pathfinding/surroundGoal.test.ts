import { describe, expect, it } from 'vitest';
import { GRID_CONFIG } from '../config/gridConfig';
import { bodyHalfExtent } from '../config/entityBodies';
import { getEnemyDefinitionOrThrow } from '../config/enemyCatalog';
import { Grid } from '../grid/Grid';
import { tileCenterWorld } from '../grid/worldPosition';
import { collectAttackRingTiles, pickSurroundGoalTile } from './surroundGoal';
import { tileKey } from './tileKey';

describe('surroundGoal', () =>
{
    const grid = new Grid(GRID_CONFIG);
    const enemyHalf = bodyHalfExtent(
        GRID_CONFIG,
        getEnemyDefinitionOrThrow('basic').visual.sizeScale,
    );
    const towerHalf = bodyHalfExtent(GRID_CONFIG, 0.75);
    const rangePx = grid.rangeToPixels(1.25);

    const towerAt = (col: number, row: number) => ({
        position: tileCenterWorld(GRID_CONFIG, { col, row }),
        bodyHalfWidth: towerHalf,
        bodyHalfHeight: towerHalf,
    });

    it('collects multiple tiles around a tower', () =>
    {
        const ring = collectAttackRingTiles(
            grid,
            towerAt(5, 5),
            enemyHalf,
            enemyHalf,
            rangePx,
            new Set(),
        );

        expect(ring.length).toBeGreaterThan(4);
        expect(ring.some((t) => t.col === 5 && t.row === 5)).toBe(false);
    });

    it('assigns different goals for different slot indices', () =>
    {
        const target = towerAt(5, 20);
        const blocked = new Set<string>();
        const startA = { col: 0, row: 20 };
        const startB = { col: 9, row: 20 };

        const goalA = pickSurroundGoalTile(
            grid,
            startA,
            target,
            enemyHalf,
            enemyHalf,
            rangePx,
            blocked,
            new Set(),
            0,
        );
        const goalB = pickSurroundGoalTile(
            grid,
            startB,
            target,
            enemyHalf,
            enemyHalf,
            rangePx,
            blocked,
            goalA ? new Set([ tileKey(goalA) ]) : new Set(),
            1,
        );

        expect(goalA).not.toBeNull();
        expect(goalB).not.toBeNull();
        expect(tileKey(goalA!)).not.toBe(tileKey(goalB!));
    });
});
