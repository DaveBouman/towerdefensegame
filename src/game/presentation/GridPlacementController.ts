import type { Input, Scene } from 'phaser';
import { isPlayerPlacementTile } from '../config/placementZone';
import type { Grid } from '../grid/Grid';
import type { GridPosition } from '../grid/types';

export class GridPlacementController
{
    private readonly onPointerDown: (pointer: Input.Pointer) => void;

    constructor (
        private readonly scene: Scene,
        private readonly grid: Grid,
        private readonly isDeploymentActive: () => boolean,
        private readonly onTileChosen: (tile: GridPosition) => void,
        private readonly shouldIgnorePointer: (pointer: Input.Pointer) => boolean = () => false,
    )
    {
        this.onPointerDown = (pointer: Input.Pointer) =>
        {
            if (!this.isDeploymentActive() || this.shouldIgnorePointer(pointer))
            {
                return;
            }

            const tile = this.grid.toGrid(pointer.worldX, pointer.worldY);

            if (!tile || !isPlayerPlacementTile(tile))
            {
                return;
            }

            this.onTileChosen(tile);
        };

        this.scene.input.on('pointerdown', this.onPointerDown);
    }

    destroy (): void
    {
        this.scene.input.off('pointerdown', this.onPointerDown);
    }
}
