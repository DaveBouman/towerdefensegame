import { EventBus } from '../EventBus';
import { createTowerState } from '../domain/createTowerState';
import { TowerState } from '../domain/TowerState';
import { GAME_EVENTS } from '../events/gameEvents';
import { isPlayerPlacementTile } from '../config/placementZone';
import { LONG_RANGE_TOWER_SPAWN, PLAYER_TOWER_SPAWN } from '../config/spawnConfig';
import type { TowerArchetype } from '../domain/towers/types';
import type { Grid } from '../grid/Grid';
import type { GridPosition } from '../grid/types';
import type { CollisionSystem } from './CollisionSystem';

export class TowerPlacementSystem
{
    private readonly placed = new Map<string, TowerState>();

    constructor (
        private readonly grid: Grid,
        private readonly collision: CollisionSystem,
    ) {}

    get all (): readonly TowerState[]
    {
        return [ ...this.placed.values() ];
    }

    getSnapshot (id: string)
    {
        return this.placed.get(id)?.snapshot();
    }

    placePlayer (): TowerState
    {
        return this.place(PLAYER_TOWER_SPAWN, 'close');
    }

    placeLongRange (): TowerState
    {
        return this.place(LONG_RANGE_TOWER_SPAWN, 'long');
    }

    place (tile: GridPosition, archetype: TowerArchetype): TowerState
    {
        const tower = this.tryPlace(tile, archetype);

        if (!tower)
        {
            throw new Error(`Cannot place ${archetype} tower at ${tile.col},${tile.row}`);
        }

        return tower;
    }

    tryPlace (tile: GridPosition, archetype: TowerArchetype): TowerState | null
    {
        if (!this.grid.isInBounds(tile) || !isPlayerPlacementTile(tile))
        {
            return null;
        }

        const tower = createTowerState(this.grid, tile, archetype);

        if (!this.collision.register(
            tower.id,
            'tower',
            tower.position,
            tower.bodyHalfWidth,
            tower.bodyHalfHeight,
        ))
        {
            return null;
        }

        this.placed.set(tower.id, tower);
        EventBus.emit(GAME_EVENTS.TOWER_PLACED, tower.snapshot());

        return tower;
    }

    clearAll (): void
    {
        for (const id of [ ...this.placed.keys() ])
        {
            this.remove(id);
        }
    }

    remove (id: string): void
    {
        if (!this.placed.delete(id))
        {
            return;
        }

        this.collision.unregister(id);
        EventBus.emit(GAME_EVENTS.TOWER_REMOVED, { id });
    }

    resetPlayerTowers (): void
    {
        const present = new Set<TowerArchetype>();

        for (const tower of this.all)
        {
            present.add(tower.profile.archetype);
            tower.resetForNextWave(this.grid);
            this.collision.setPositionFromPath(tower.id, tower.position);
            EventBus.emit(GAME_EVENTS.TOWER_DAMAGED, tower.snapshot());
        }

        if (!present.has('close'))
        {
            this.placePlayer();
        }

        if (!present.has('long'))
        {
            this.placeLongRange();
        }
    }
}
