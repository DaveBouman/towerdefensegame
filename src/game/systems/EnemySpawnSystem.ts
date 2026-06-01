import { EventBus } from '../EventBus';
import { EnemyState } from '../domain/EnemyState';
import { GAME_EVENTS } from '../events/gameEvents';
import type { EnemyDefinitionId } from '../config/enemyCatalog';
import { getEnemyDefinitionOrThrow } from '../config/enemyCatalog';
import type { GridPosition } from '../grid/types';
import { tileCenterWorld } from '../grid/worldPosition';
import { GRID_CONFIG } from '../config/gridConfig';
import { bodyHalfExtent } from '../config/entityBodies';
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

    trySpawnAt (tile: GridPosition, kind: EnemyDefinitionId, isPreview = false): EnemyState | null
    {
        const definition = getEnemyDefinitionOrThrow(kind);
        const half = bodyHalfExtent(GRID_CONFIG, definition.visual.sizeScale);
        const enemy = new EnemyState(
            tileCenterWorld(GRID_CONFIG, tile),
            definition.id,
            definition.unitType,
            definition.baseStats,
            half,
            half,
            definition.perks,
            isPreview,
        );

        return this.tryRegisterEnemy(enemy);
    }

    trySpawnPreviewAt (tile: GridPosition, kind: EnemyDefinitionId): EnemyState | null
    {
        return this.trySpawnAt(tile, kind, true);
    }

    /** Shows the full spawn pattern for an upcoming wave (frozen, non-combat). */
    spawnWavePreview (wave: number): void
    {
        const definition = getWaveDefinition(wave);
        const placedTiles = new Set<string>();

        for (const entry of definition.spawns)
        {
            const tileKey = `${entry.tile.col},${entry.tile.row}`;

            if (placedTiles.has(tileKey))
            {
                continue;
            }

            if (this.trySpawnPreviewAt(entry.tile, entry.kind))
            {
                placedTiles.add(tileKey);
            }
        }
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
}
