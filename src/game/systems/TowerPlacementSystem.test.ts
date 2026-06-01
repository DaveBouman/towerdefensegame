import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../EventBus', () => ({
    EventBus: {
        emit: vi.fn(),
        on: vi.fn(),
        off: vi.fn(),
    },
}));

import { GRID_CONFIG } from '../config/gridConfig';
import { WORLD_LAYOUT } from '../config/worldLayout';
import { Grid } from '../grid/Grid';
import { CollisionSystem } from './CollisionSystem';
import { TowerPlacementSystem } from './TowerPlacementSystem';

describe('TowerPlacementSystem.tryRelocate', () =>
{
    const grid = new Grid(GRID_CONFIG);
    let collision: CollisionSystem;
    let towers: TowerPlacementSystem;

    beforeEach(() =>
    {
        collision = new CollisionSystem(WORLD_LAYOUT.arenaPixelSize());
        towers = new TowerPlacementSystem(grid, collision);
    });

    it('moves a tower to an empty placement tile', () =>
    {
        const tower = towers.tryPlace({ col: 4, row: 35 }, 'militia');

        expect(tower).not.toBeNull();
        expect(towers.tryRelocate(tower!.id, { col: 6, row: 37 })).toBe(true);
        expect(tower!.spawnTile).toEqual({ col: 6, row: 37 });
    });

    it('rejects a tile occupied by another tower', () =>
    {
        const a = towers.tryPlace({ col: 3, row: 35 }, 'militia');
        const b = towers.tryPlace({ col: 5, row: 35 }, 'scout');

        expect(a).not.toBeNull();
        expect(b).not.toBeNull();
        expect(towers.tryRelocate(a!.id, { col: 5, row: 35 })).toBe(false);
        expect(a!.spawnTile).toEqual({ col: 3, row: 35 });
    });
});
