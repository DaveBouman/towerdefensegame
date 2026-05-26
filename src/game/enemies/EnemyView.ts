import { GameObjects } from 'phaser';
import type { Scene } from 'phaser';
import { HealthBarView } from '../presentation/HealthBarView';
import type { EnemyViewOptions } from './types';

export class EnemyView
{
    readonly gameObject: GameObjects.Container;
    private readonly body: GameObjects.Rectangle;
    private readonly baseColor: number;
    private readonly healthBar: HealthBarView;

    constructor (
        scene: Scene,
        size: number,
        color: number,
        options: EnemyViewOptions = {},
    )
    {
        const container = scene.add.container(0, 0);
        const outline = new GameObjects.Rectangle(scene, 0, 0, size, size);

        outline.setOrigin(0, 0);
        outline.setStrokeStyle(2, color, 0.65);
        outline.setFillStyle(color, 0.08);
        container.add(outline);

        const body = new GameObjects.Rectangle(scene, 0, 0, size, size, color);

        this.body = body;
        this.baseColor = color;
        body.setOrigin(0, 0);

        if (options.onSelect)
        {
            body.setInteractive({ useHandCursor: true });
            body.on('pointerdown', () => options.onSelect?.());
        }

        container.add(body);

        this.healthBar = new HealthBarView(scene, size);
        this.healthBar.addTo(container);
        this.healthBar.setFraction(1);

        this.gameObject = container;
    }

    setHealthFraction (fraction: number): void
    {
        this.healthBar.setFraction(fraction);
    }

    setPosition (x: number, y: number): void
    {
        this.gameObject.setPosition(x, y);
    }

    flashHit (): void
    {
        const scene = this.gameObject.scene;

        if (!scene)
        {
            return;
        }

        this.body.setFillStyle(0xffffff);

        scene.time.delayedCall(100, () =>
        {
            if (this.body.active)
            {
                this.body.setFillStyle(this.baseColor);
            }
        });
    }

    destroy (): void
    {
        this.gameObject.destroy();
    }
}
