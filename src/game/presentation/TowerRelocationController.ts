import type { Input, Scene } from 'phaser';
import { isPlayerPlacementTile } from '../config/placementZone';
import type { Grid } from '../grid/Grid';
import type { GridPosition } from '../grid/types';
import type { WorldPosition } from '../grid/types';

export class TowerRelocationController
{
    private dragTowerId: string | null = null;
    private readonly onPointerDown: (pointer: Input.Pointer) => void;
    private readonly onPointerUp: (pointer: Input.Pointer) => void;

    constructor (
        private readonly scene: Scene,
        private readonly grid: Grid,
        private readonly canRelocate: () => boolean,
        private readonly pickTowerAtWorld: (world: WorldPosition) => string | null,
        private readonly getSelectedTowerId: () => string | undefined,
        private readonly onRelocate: (towerId: string, tile: GridPosition) => void,
    )
    {
        this.onPointerDown = (pointer: Input.Pointer) =>
        {
            if (!this.canRelocate())
            {
                return;
            }

            const tile = this.tileAtPointer(pointer);

            if (!tile)
            {
                return;
            }

            const towerId = this.pickTowerAtWorld({
                x: pointer.worldX,
                y: pointer.worldY,
            });

            if (towerId)
            {
                this.dragTowerId = towerId;
                return;
            }

            const selectedId = this.getSelectedTowerId();

            if (selectedId && isPlayerPlacementTile(tile))
            {
                this.onRelocate(selectedId, tile);
            }
        };

        this.onPointerUp = (pointer: Input.Pointer) =>
        {
            if (!this.dragTowerId || !this.canRelocate())
            {
                this.dragTowerId = null;
                return;
            }

            const tile = this.tileAtPointer(pointer);

            if (tile && isPlayerPlacementTile(tile))
            {
                this.onRelocate(this.dragTowerId, tile);
            }

            this.dragTowerId = null;
        };

        this.scene.input.on('pointerdown', this.onPointerDown);
        this.scene.input.on('pointerup', this.onPointerUp);
    }

    destroy (): void
    {
        this.scene.input.off('pointerdown', this.onPointerDown);
        this.scene.input.off('pointerup', this.onPointerUp);
    }

    private tileAtPointer (pointer: Input.Pointer): GridPosition | null
    {
        return this.grid.toGrid(pointer.worldX, pointer.worldY);
    }
}
