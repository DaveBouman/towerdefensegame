import { GameObjects } from 'phaser';
import type { Input, Scene } from 'phaser';
import { isPlayerPlacementTile } from '../config/placementZone';
import type { Grid } from '../grid/Grid';
import type { GridPosition } from '../grid/types';
import type { WorldPosition } from '../grid/types';

const DROP_VALID = 0x2ecc71;
const DROP_INVALID = 0xe74c3c;

export interface TowerRelocationCallbacks
{
    onRelocate: (towerId: string, tile: GridPosition) => void;
    onDragStart?: (towerId: string, world: WorldPosition) => void;
    onDragMove?: (towerId: string, world: WorldPosition) => void;
    onDragEnd?: (towerId: string) => void;
    canDropAt?: (towerId: string, tile: GridPosition) => boolean;
}

export class TowerRelocationController
{
    private dragTowerId: string | null = null;
    private readonly dropHighlight: GameObjects.Rectangle;
    private readonly onPointerDown: (pointer: Input.Pointer) => void;
    private readonly onPointerMove: (pointer: Input.Pointer) => void;
    private readonly onPointerUp: (pointer: Input.Pointer) => void;

    constructor (
        private readonly scene: Scene,
        private readonly grid: Grid,
        private readonly canRelocate: () => boolean,
        private readonly pickTowerAtWorld: (world: WorldPosition) => string | null,
        private readonly getSelectedTowerId: () => string | undefined,
        private readonly callbacks: TowerRelocationCallbacks,
    )
    {
        const { tileSize } = grid.config;

        this.dropHighlight = scene.add.rectangle(0, 0, tileSize, tileSize, DROP_VALID, 0.35);
        this.dropHighlight.setOrigin(0, 0);
        this.dropHighlight.setStrokeStyle(2, DROP_VALID, 0.9);
        this.dropHighlight.setDepth(4);
        this.dropHighlight.setVisible(false);

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
                this.scene.input.setDefaultCursor('grabbing');
                this.callbacks.onDragStart?.(towerId, {
                    x: pointer.worldX,
                    y: pointer.worldY,
                });
                this.updateDropPreview(pointer);
                return;
            }

            const selectedId = this.getSelectedTowerId();

            if (selectedId && isPlayerPlacementTile(tile))
            {
                this.callbacks.onRelocate(selectedId, tile);
            }
        };

        this.onPointerMove = (pointer: Input.Pointer) =>
        {
            if (!this.dragTowerId || !this.canRelocate())
            {
                return;
            }

            this.callbacks.onDragMove?.(this.dragTowerId, {
                x: pointer.worldX,
                y: pointer.worldY,
            });
            this.updateDropPreview(pointer);
        };

        this.onPointerUp = (pointer: Input.Pointer) =>
        {
            if (!this.dragTowerId || !this.canRelocate())
            {
                this.dragTowerId = null;
                this.hideDropPreview();
                this.scene.input.setDefaultCursor('default');
                return;
            }

            const towerId = this.dragTowerId;
            const tile = this.tileAtPointer(pointer);

            this.callbacks.onDragEnd?.(towerId);

            if (tile && isPlayerPlacementTile(tile))
            {
                this.callbacks.onRelocate(towerId, tile);
            }

            this.dragTowerId = null;
            this.hideDropPreview();
            this.scene.input.setDefaultCursor('default');
        };

        this.scene.input.on('pointerdown', this.onPointerDown);
        this.scene.input.on('pointermove', this.onPointerMove);
        this.scene.input.on('pointerup', this.onPointerUp);
    }

    destroy (): void
    {
        this.scene.input.off('pointerdown', this.onPointerDown);
        this.scene.input.off('pointermove', this.onPointerMove);
        this.scene.input.off('pointerup', this.onPointerUp);
        this.dropHighlight.destroy();
    }

    private tileAtPointer (pointer: Input.Pointer): GridPosition | null
    {
        return this.grid.toGrid(pointer.worldX, pointer.worldY);
    }

    private updateDropPreview (pointer: Input.Pointer): void
    {
        if (!this.dragTowerId)
        {
            return;
        }

        const tile = this.tileAtPointer(pointer);

        if (!tile || !isPlayerPlacementTile(tile))
        {
            this.hideDropPreview();
            return;
        }

        const valid = this.callbacks.canDropAt?.(this.dragTowerId, tile) ?? true;
        const world = this.grid.toWorld(tile);

        this.dropHighlight.setPosition(world.x, world.y);
        this.dropHighlight.setFillStyle(valid ? DROP_VALID : DROP_INVALID, 0.35);
        this.dropHighlight.setStrokeStyle(2, valid ? DROP_VALID : DROP_INVALID, 0.9);
        this.dropHighlight.setVisible(true);
    }

    private hideDropPreview (): void
    {
        this.dropHighlight.setVisible(false);
    }
}
