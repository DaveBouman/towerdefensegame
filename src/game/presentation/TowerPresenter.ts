import { EventBus } from '../EventBus';
import { GAME_EVENTS } from '../events/gameEvents';
import { Tower } from '../towers/Tower';
import { getTowerVisualConfig } from '../towers/towerVisuals';
import type { TowerStateSnapshot } from '../domain/types';
import type { WorldPosition } from '../grid/types';
import type { Grid } from '../grid/Grid';
import { canAddToScene } from './sceneReady';

export class TowerPresenter
{
    private readonly towers = new Map<string, Tower>();

    constructor (
        private readonly resolveSnapshot: (id: string) => TowerStateSnapshot | undefined,
        private readonly canSelectTower: () => boolean = () => true,
    ) {}

    place (scene: Phaser.Scene, grid: Grid, snapshot: TowerStateSnapshot): void
    {
        if (!canAddToScene(scene))
        {
            return;
        }

        const config = getTowerVisualConfig(snapshot.archetype);
        const towerId = snapshot.id;

        const onSelect = () =>
        {
            if (!this.canSelectTower())
            {
                return;
            }

            const current = this.resolveSnapshot(towerId);

            if (current)
            {
                EventBus.emit(GAME_EVENTS.TOWER_SELECTED, current);
            }
        };

        const tower = new Tower(scene, grid, snapshot.position, config, onSelect);

        this.towers.set(snapshot.id, tower);
        tower.setHealth(snapshot.health, snapshot.maxHealth);
    }

    setTargetPosition (towerId: string, position: WorldPosition): void
    {
        this.towers.get(towerId)?.setTargetPosition(position);
    }

    snapToTarget (towerId: string): void
    {
        this.towers.get(towerId)?.snapToTarget();
    }

    setHealth (towerId: string, health: number, maxHealth: number): void
    {
        this.towers.get(towerId)?.setHealth(health, maxHealth);
    }

    getDisplayPosition (towerId: string): WorldPosition | undefined
    {
        return this.towers.get(towerId)?.getDisplayPosition();
    }

    setRelocateMode (enabled: boolean): void
    {
        for (const tower of this.towers.values())
        {
            tower.setRelocateEnabled(enabled);
        }
    }

    beginDrag (towerId: string, world: WorldPosition): void
    {
        this.towers.get(towerId)?.beginDrag(world);
    }

    updateDrag (towerId: string, world: WorldPosition): void
    {
        this.towers.get(towerId)?.updateDrag(world);
    }

    endDrag (towerId: string): void
    {
        this.towers.get(towerId)?.endDrag();
    }

    lerpFrame (deltaMs: number): void
    {
        for (const tower of this.towers.values())
        {
            tower.lerpTowardTarget(deltaMs);
        }
    }

    playAttack (towerId: string): void
    {
        this.towers.get(towerId)?.playAttack();
    }

    remove (id: string): void
    {
        this.towers.get(id)?.destroy();
        this.towers.delete(id);
    }

    clearAll (): void
    {
        for (const tower of this.towers.values())
        {
            tower.destroy();
        }

        this.towers.clear();
    }
}
