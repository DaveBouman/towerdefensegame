import { describe, expect, it } from 'vitest';
import { GRID_CONFIG } from '../config/gridConfig';
import { Grid } from '../grid/Grid';
import { CollisionSystem } from '../systems/CollisionSystem';
import { WORLD_LAYOUT } from '../config/worldLayout';
import { tileCenterWorld } from '../grid/worldPosition';
import { buildBlockedTiles, buildPathfindingBlockedTiles } from './buildBlockedTiles';
import { tileKey } from './tileKey';

describe('buildBlockedTiles', () =>
{
    const grid = new Grid(GRID_CONFIG);
    const arena = WORLD_LAYOUT.arenaPixelSize();

    it('can exclude enemies from pathfinding blockers', () =>
    {
        const collision = new CollisionSystem(arena);
        const tile = { col: 4, row: 20 };
        const center = tileCenterWorld(GRID_CONFIG, tile);

        collision.register('enemy-a', 'enemy', center, 16, 16);
        collision.register('enemy-b', 'enemy', { x: center.x + 80, y: center.y }, 16, 16);

        const allBlocked = buildBlockedTiles(grid, collision, 'enemy-b');
        const pathBlocked = buildPathfindingBlockedTiles(grid, collision, 'enemy-b');

        expect(allBlocked.has(tileKey(tile))).toBe(true);
        expect(pathBlocked.has(tileKey(tile))).toBe(false);
    });

    it('still blocks towers for pathfinding', () =>
    {
        const collision = new CollisionSystem(arena);
        const tile = { col: 4, row: 20 };
        const center = tileCenterWorld(GRID_CONFIG, tile);

        collision.register('tower-a', 'tower', center, 24, 24);

        const pathBlocked = buildPathfindingBlockedTiles(grid, collision, 'enemy-a');

        expect(pathBlocked.size).toBeGreaterThan(0);
    });
});
