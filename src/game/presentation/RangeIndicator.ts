import { GameObjects } from 'phaser';
import type { Scene } from 'phaser';
import type { WorldPosition } from '../grid/types';
import { canAddToScene } from './sceneReady';

const RANGE_DEPTH = 50;

export class RangeIndicator
{
    private ring: GameObjects.Graphics | null = null;
    private layer: GameObjects.Container | null = null;
    private cacheX = Number.NaN;
    private cacheY = Number.NaN;
    private cacheR = Number.NaN;
    private cacheColor = Number.NaN;

    show (
        scene: Scene,
        position: WorldPosition,
        radiusPx: number,
        color: number,
    ): void
    {
        const layer = this.getLayer(scene);

        if (!layer)
        {
            return;
        }

        const radius = radiusPx;
        const sameGeometry = this.ring
            && this.ring.scene === scene
            && Math.abs(position.x - this.cacheX) < 0.25
            && Math.abs(position.y - this.cacheY) < 0.25
            && Math.abs(radius - this.cacheR) < 0.25
            && color === this.cacheColor;

        if (sameGeometry)
        {
            this.ring!.setVisible(true);

            return;
        }

        this.cacheX = position.x;
        this.cacheY = position.y;
        this.cacheR = radius;
        this.cacheColor = color;

        if (!this.ring || this.ring.scene !== scene)
        {
            this.ring?.destroy();
            this.ring = new GameObjects.Graphics(scene);
            layer.add(this.ring);
        }

        this.ring.clear();
        this.ring.fillStyle(color, 0.12);
        this.ring.fillCircle(position.x, position.y, radius);
        this.ring.lineStyle(2, color, 0.85);
        this.ring.strokeCircle(position.x, position.y, radius);
        this.ring.setVisible(true);
    }

    hide (): void
    {
        this.ring?.setVisible(false);
        this.cacheX = Number.NaN;
        this.cacheY = Number.NaN;
        this.cacheR = Number.NaN;
        this.cacheColor = Number.NaN;
    }

    destroy (): void
    {
        this.ring?.destroy();
        this.ring = null;
        this.layer?.destroy();
        this.layer = null;
        this.cacheX = Number.NaN;
        this.cacheY = Number.NaN;
        this.cacheR = Number.NaN;
        this.cacheColor = Number.NaN;
    }

    private getLayer (scene: Scene): GameObjects.Container | null
    {
        if (!canAddToScene(scene))
        {
            return null;
        }

        if (!this.layer || this.layer.scene !== scene)
        {
            this.layer?.destroy();
            this.layer = scene.add.container(0, 0);
            this.layer.setDepth(RANGE_DEPTH);
        }

        return this.layer;
    }
}
