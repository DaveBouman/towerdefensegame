import { EventBus } from '../EventBus';
import { CloseRangeTowerState } from '../domain/CloseRangeTowerState';
import { LongRangeTowerState } from '../domain/LongRangeTowerState';
import { TowerState } from '../domain/TowerState';
import { GAME_EVENTS } from '../events/gameEvents';
import {
    LONG_RANGE_TOWER_SPAWN,
    PLAYER_TOWER_SPAWN,
} from '../config/spawnConfig';
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

    placePlayer (): CloseRangeTowerState
    {
        return this.placeClose(PLAYER_TOWER_SPAWN);
    }

    placeClose (tile: GridPosition): CloseRangeTowerState
    {
        const tower = new CloseRangeTowerState(this.grid, tile);

        return this.registerTower(tower);
    }

    placeLongRange (): LongRangeTowerState
    {
        return this.placeLong(LONG_RANGE_TOWER_SPAWN);
    }

    placeLong (tile: GridPosition): LongRangeTowerState
    {
        const tower = new LongRangeTowerState(this.grid, tile);

        return this.registerTower(tower);
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

    private registerTower<T extends TowerState> (tower: T): T
    {
        if (!this.collision.register(
            tower.id,
            'tower',
            tower.position,
            tower.bodyHalfWidth,
            tower.bodyHalfHeight,
        ))
        {
            throw new Error(`Cannot place tower ${tower.id}: body overlaps another entity`);
        }

        this.placed.set(tower.id, tower);
        EventBus.emit(GAME_EVENTS.TOWER_PLACED, tower.snapshot());

        return tower;
    }
}
