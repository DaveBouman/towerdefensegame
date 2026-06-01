import { EventBus } from '../EventBus';
import { GAME_EVENTS } from '../events/gameEvents';
import { BasicEnemy } from '../enemies/BasicEnemy';
import type { EnemyStateSnapshot } from '../domain/types';
import type { WorldPosition } from '../grid/types';
import type { Grid } from '../grid/Grid';
import { canAddToScene } from './sceneReady';

export class EnemyPresenter
{
    private readonly enemies = new Map<string, BasicEnemy>();

    constructor (
        private readonly resolveSnapshot: (id: string) => EnemyStateSnapshot | undefined,
    ) {}

    spawn (scene: Phaser.Scene, grid: Grid, snapshot: EnemyStateSnapshot): void
    {
        if (!canAddToScene(scene))
        {
            return;
        }

        const enemy = new BasicEnemy(scene, grid, snapshot.position, () =>
        {
            const current = this.resolveSnapshot(snapshot.id);

            if (current)
            {
                EventBus.emit(GAME_EVENTS.ENEMY_SELECTED, current);
            }
        });

        this.enemies.set(snapshot.id, enemy);
        enemy.setHealth(snapshot.health, snapshot.stats.maxHealth);

        if (snapshot.isPreview)
        {
            enemy.setPreviewAppearance();
        }
    }

    setHealth (enemyId: string, health: number, maxHealth: number): void
    {
        this.enemies.get(enemyId)?.setHealth(health, maxHealth);
    }

    setTargetPosition (enemyId: string, position: WorldPosition): void
    {
        this.enemies.get(enemyId)?.setTargetPosition(position);
    }

    getDisplayPosition (enemyId: string): WorldPosition | undefined
    {
        return this.enemies.get(enemyId)?.getDisplayPosition();
    }

    lerpFrame (deltaMs: number): void
    {
        for (const enemy of this.enemies.values())
        {
            enemy.lerpTowardTarget(deltaMs);
        }
    }

    flashHit (enemyId: string): void
    {
        this.enemies.get(enemyId)?.flashHit();
    }

    remove (id: string): void
    {
        this.enemies.get(id)?.destroy();
        this.enemies.delete(id);
    }

    clearAll (): void
    {
        for (const enemy of this.enemies.values())
        {
            enemy.destroy();
        }

        this.enemies.clear();
    }
}
