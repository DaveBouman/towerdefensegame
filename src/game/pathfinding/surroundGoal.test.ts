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
    const towerHalf = bodyHalfExtent(GRID_CONFIG, 0.7);
    const rangePx = grid.rangeToPixels(1.5);

    const towerAt = (col: number, row: number) => ({
        position: tileCenterWorld(GRID_CONFIG, { col, row }),
        bodyHalfWidth: towerHalf,
        bodyHalfHeight: towerHalf,
    });

    it('collects attack tiles around a tower on a small grid', () =>
    {
        const ring = collectAttackRingTiles(
            grid,
            towerAt(1, 1),
            enemyHalf,
            enemyHalf,
            rangePx,
            new Set(),
        );

        expect(ring.length).toBeGreaterThan(0);
        expect(ring.some((t) => t.col === 1 && t.row === 1)).toBe(false);
    });

    it('assigns different goals for different slot indices', () =>
    {
        const target = towerAt(1, 1);
        const blocked = new Set<string>();

        const goalA = pickSurroundGoalTile(
            grid,
            { col: 0, row: 0 },
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
            { col: 2, row: 0 },
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
