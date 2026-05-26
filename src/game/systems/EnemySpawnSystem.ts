import { EventBus } from '../EventBus';
import { BasicEnemyState } from '../domain/BasicEnemyState';
import { EnemyState } from '../domain/EnemyState';
import { GAME_EVENTS } from '../events/gameEvents';
import type { EnemyBaseStats } from '../domain/combat/types';
import type { EnemyPerk } from '../domain/perks/types';
import type { GridPosition } from '../grid/types';
import { tileCenterWorld } from '../grid/worldPosition';
import { GRID_CONFIG } from '../config/gridConfig';
import { bodyHalfExtent } from '../config/entityBodies';
import type { CollisionSystem } from './CollisionSystem';

export class EnemySpawnSystem
{
    private readonly active = new Map<string, EnemyState>();

    constructor (private readonly collision: CollisionSystem) {}

    get all (): readonly EnemyState[]
    {
        return [ ...this.active.values() ];
    }

    getSnapshot (id: string)
    {
        return this.active.get(id)?.snapshot();
    }

    spawnBasic (): BasicEnemyState
    {
        const enemy = new BasicEnemyState();

        return this.registerEnemy(enemy);
    }

    spawnAt (
        tile: GridPosition,
        baseStats: EnemyBaseStats,
        sizeScale: number,
        perks: readonly EnemyPerk[] = [],
    ): EnemyState
    {
        const half = bodyHalfExtent(GRID_CONFIG, sizeScale);
        const enemy = new EnemyState(
            tileCenterWorld(GRID_CONFIG, tile),
            'Enemy',
            baseStats,
            half,
            half,
            perks,
        );

        return this.registerEnemy(enemy);
    }

    remove (id: string): void
    {
        if (!this.active.delete(id))
        {
            return;
        }

        this.collision.unregister(id);
        EventBus.emit(GAME_EVENTS.ENEMY_REMOVED, { id });
    }

    private registerEnemy<T extends EnemyState> (enemy: T): T
    {
        if (!this.collision.register(
            enemy.id,
            'enemy',
            enemy.position,
            enemy.bodyHalfWidth,
            enemy.bodyHalfHeight,
        ))
        {
            throw new Error(`Cannot spawn enemy ${enemy.id}: body overlaps another entity`);
        }

        this.active.set(enemy.id, enemy);
        EventBus.emit(GAME_EVENTS.ENEMY_SPAWNED, enemy.snapshot());

        return enemy;
    }
}
