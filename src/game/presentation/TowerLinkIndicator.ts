import { GameObjects } from 'phaser';
import type { Scene } from 'phaser';
import type { TowerPairLink } from '../combat/towerPairLinks';
import type { WorldPosition } from '../grid/types';
import { canAddToScene } from './sceneReady';

const LINK_DEPTH = 12;
const DEFAULT_LINK_COLOR = 0x78f0b8;
const DEFAULT_LINK_ALPHA = 0.9;

export class TowerLinkIndicator
{
    private graphics: GameObjects.Graphics | null = null;
    private layer: GameObjects.Container | null = null;

    constructor (
        private readonly linkColor = DEFAULT_LINK_COLOR,
        private readonly linkAlpha = DEFAULT_LINK_ALPHA,
    ) {}

    sync (
        scene: Scene,
        links: readonly TowerPairLink[],
        resolvePosition: (towerId: string) => WorldPosition | undefined,
    ): void
    {
        const layer = this.getLayer(scene);

        if (!layer)
        {
            return;
        }

        if (!this.graphics || this.graphics.scene !== scene)
        {
            this.graphics?.destroy();
            this.graphics = new GameObjects.Graphics(scene);
            layer.add(this.graphics);
        }

        this.graphics.clear();

        for (const link of links)
        {
            const from = resolvePosition(link.towerIdA);
            const to = resolvePosition(link.towerIdB);

            if (!from || !to)
            {
                continue;
            }

            this.graphics.lineStyle(2, this.linkColor, this.linkAlpha * 0.45);
            this.graphics.beginPath();
            this.graphics.moveTo(from.x, from.y);
            this.graphics.lineTo(to.x, to.y);
            this.graphics.strokePath();

            this.graphics.lineStyle(3, this.linkColor, this.linkAlpha);
            this.graphics.beginPath();
            this.graphics.moveTo(from.x, from.y);
            this.graphics.lineTo(to.x, to.y);
            this.graphics.strokePath();

            this.graphics.fillStyle(this.linkColor, this.linkAlpha);
            this.graphics.fillCircle(from.x, from.y, 5);
            this.graphics.fillCircle(to.x, to.y, 5);
        }
    }

    clear (): void
    {
        this.graphics?.clear();
    }

    destroy (): void
    {
        this.graphics?.destroy();
        this.graphics = null;
        this.layer?.destroy();
        this.layer = null;
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
            this.layer.setDepth(LINK_DEPTH);
        }

        return this.layer;
    }
}
