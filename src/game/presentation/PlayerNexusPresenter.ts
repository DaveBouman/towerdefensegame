import { PLAYER_NEXUS_CONFIG } from '../config/playerNexusConfig';
import type { PlayerNexusStateSnapshot } from '../domain/types';
import { Tower } from '../towers/Tower';
import type { Grid } from '../grid/Grid';
import { canAddToScene } from './sceneReady';

export class PlayerNexusPresenter
{
    private view: Tower | null = null;

    constructor (
        private readonly onSelect?: () => void,
    ) {}

    spawn (scene: Phaser.Scene, grid: Grid, snapshot: PlayerNexusStateSnapshot): void
    {
        if (!canAddToScene(scene))
        {
            return;
        }

        this.view = new Tower(
            scene,
            grid,
            snapshot.position,
            {
                color: PLAYER_NEXUS_CONFIG.color,
                sizeScale: PLAYER_NEXUS_CONFIG.sizeScale,
            },
            this.onSelect,
        );
        this.view.setHealth(snapshot.health, snapshot.maxHealth);
    }

    setHealth (health: number, maxHealth: number): void
    {
        this.view?.setHealth(health, maxHealth);
    }

    destroy (): void
    {
        this.view?.destroy();
        this.view = null;
    }
}
