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
import {
    ENEMY_NEXUS_ID,
    ENEMY_NEXUS_KIND,
    getEnemyNexusWorldPosition,
} from '../config/nexusConfig';
import { enemiesAttackableByTowers, livingMinions } from '../combat/targetPriority';
import type { CollisionSystem } from './CollisionSystem';

export class EnemySpawnSystem
{
    private readonly active = new Map<string, EnemyState>();

    constructor (private readonly collision: CollisionSystem) {}

    get all (): readonly EnemyState[]
    {
        return [ ...this.active.values() ];
    }

  /** Living wave units (excludes the enemy nexus). */
    get combatants (): readonly EnemyState[]
    {
        return livingMinions(this.all);
    }

    get livingCombatCount (): number
    {
        return this.combatants.length;
    }

    getEnemyNexus (): EnemyState | undefined
    {
        return this.active.get(ENEMY_NEXUS_ID);
    }

    get attackableByTowers (): readonly EnemyState[]
    {
        return enemiesAttackableByTowers(this.all);
    }

    /** Full-health enemy nexus at run start (or after a full session reset). */
    resetEnemyNexus (): EnemyState | null
    {
        this.remove(ENEMY_NEXUS_ID, true);

        return this.spawnEnemyNexus();
    }

    spawnEnemyNexus (): EnemyState | null
    {
        if (this.getEnemyNexus())
        {
            return this.getEnemyNexus() ?? null;
        }

        const definition = getEnemyDefinitionOrThrow(ENEMY_NEXUS_KIND);
        const half = bodyHalfExtent(GRID_CONFIG, definition.visual.sizeScale);
        const enemy = new EnemyState(
            getEnemyNexusWorldPosition(),
            definition.id,
            definition.unitType,
            definition.baseStats,
            half,
            half,
            definition.perks,
            false,
            true,
            ENEMY_NEXUS_ID,
        );

        return this.tryRegisterEnemy(enemy);
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
            const enemy = this.active.get(id);

            if (enemy?.isNexus)
            {
                continue;
            }

            this.remove(id);
        }
    }

    remove (id: string, force = false): void
    {
        const enemy = this.active.get(id);

        if (enemy?.isNexus && !force)
        {
            return;
        }

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
