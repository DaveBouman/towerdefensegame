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
import {
    BASIC_ENEMY_BASE_STATS,
    BASIC_ENEMY_PERKS,
    BASIC_ENEMY_UNIT_TYPE,
} from '../config/basicEnemyStats';
import { BASIC_ENEMY_CONFIG } from '../config/enemyConfig';
import { getWaveDefinition } from '../config/waveCatalog';
import type { CollisionSystem } from './CollisionSystem';

export class EnemySpawnSystem
{
    private readonly active = new Map<string, EnemyState>();

    constructor (private readonly collision: CollisionSystem) {}

    get all (): readonly EnemyState[]
    {
        return [ ...this.active.values() ];
    }

    get combatants (): readonly EnemyState[]
    {
        return this.all.filter((enemy) => !enemy.isPreview && enemy.health > 0);
    }

    get livingCombatCount (): number
    {
        return this.combatants.length;
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

    trySpawnBasicAt (tile: GridPosition): EnemyState | null
    {
        return this.spawnBasicAt(tile, false);
    }

    trySpawnBasicPreviewAt (tile: GridPosition): EnemyState | null
    {
        return this.spawnBasicAt(tile, true);
    }

    /** Shows the full spawn pattern for an upcoming wave (frozen, non-combat). */
    spawnWavePreview (wave: number): void
    {
        const definition = getWaveDefinition(wave);
        const placedTiles = new Set<string>();

        for (const entry of definition.spawns)
        {
            if (entry.kind !== 'basic')
            {
                continue;
            }

            const tileKey = `${entry.tile.col},${entry.tile.row}`;

            if (placedTiles.has(tileKey))
            {
                continue;
            }

            if (this.trySpawnBasicPreviewAt(entry.tile))
            {
                placedTiles.add(tileKey);
            }
        }
    }

    private spawnBasicAt (tile: GridPosition, isPreview: boolean): EnemyState | null
    {
        const half = bodyHalfExtent(GRID_CONFIG, BASIC_ENEMY_CONFIG.sizeScale);
        const enemy = new EnemyState(
            tileCenterWorld(GRID_CONFIG, tile),
            BASIC_ENEMY_UNIT_TYPE,
            BASIC_ENEMY_BASE_STATS,
            half,
            half,
            BASIC_ENEMY_PERKS,
            isPreview,
        );

        return this.tryRegisterEnemy(enemy);
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

    removeAllPreviews (): void
    {
        for (const enemy of this.all)
        {
            if (enemy.isPreview)
            {
                this.remove(enemy.id);
            }
        }
    }

    private tryRegisterEnemy<T extends EnemyState> (enemy: T): T | null
    {
        if (!enemy.isPreview)
        {
            if (!this.collision.register(
                enemy.id,
                'enemy',
                enemy.position,
                enemy.bodyHalfWidth,
                enemy.bodyHalfHeight,
            ))
            {
                return null;
            }
        }

        this.active.set(enemy.id, enemy);
        EventBus.emit(GAME_EVENTS.ENEMY_SPAWNED, enemy.snapshot());

        return enemy;
    }

    clearAll (): void
    {
        for (const id of [ ...this.active.keys() ])
        {
            this.remove(id);
        }
    }

    remove (id: string): void
    {
        const enemy = this.active.get(id);

        if (!enemy || !this.active.delete(id))
        {
            return;
        }

        if (!enemy.isPreview)
        {
            this.collision.unregister(id);
        }

        EventBus.emit(GAME_EVENTS.ENEMY_REMOVED, { id });
    }

    private registerEnemy<T extends EnemyState> (enemy: T): T
    {
        const registered = this.tryRegisterEnemy(enemy);

        if (!registered)
        {
            throw new Error(`Cannot spawn enemy ${enemy.id}: body overlaps another entity`);
        }

        return registered;
    }
}
