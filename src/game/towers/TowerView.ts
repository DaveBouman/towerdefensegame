import { GameObjects } from 'phaser';
import type { Scene } from 'phaser';
import { HealthBarView } from '../presentation/HealthBarView';
import type { TowerViewOptions } from './types';

export class TowerView
{
    readonly gameObject: GameObjects.Container;
    private readonly healthBar: HealthBarView;
    private readonly body: GameObjects.Rectangle;
    private readonly scene: Scene;
    private relocateEnabled = false;
    private readonly onPointerOver: () => void;
    private readonly onPointerOut: () => void;

    constructor (
        scene: Scene,
        size: number,
        color: number,
        options: TowerViewOptions = {},
    )
    {
        this.scene = scene;
        const container = scene.add.container(0, 0);
        const outline = new GameObjects.Rectangle(scene, 0, 0, size, size);

        outline.setOrigin(0, 0);
        outline.setStrokeStyle(2, color, 0.65);
        outline.setFillStyle(color, 0.08);
        container.add(outline);

        const body = new GameObjects.Rectangle(scene, 0, 0, size, size, color);

        body.setOrigin(0, 0);
        this.body = body;

        if (options.onSelect)
        {
            body.setInteractive({ useHandCursor: true });
            body.on('pointerdown', () => options.onSelect?.());
        }

        this.onPointerOver = () =>
        {
            if (this.relocateEnabled)
            {
                this.scene.input.setDefaultCursor('grab');
            }
        };

        this.onPointerOut = () =>
        {
            if (this.relocateEnabled)
            {
                this.scene.input.setDefaultCursor('default');
            }
        };

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

    setRelocateEnabled (enabled: boolean): void
    {
        if (enabled === this.relocateEnabled)
        {
            return;
        }

        this.relocateEnabled = enabled;

        if (enabled)
        {
            this.body.on('pointerover', this.onPointerOver);
            this.body.on('pointerout', this.onPointerOut);
        }
        else
        {
            this.body.off('pointerover', this.onPointerOver);
            this.body.off('pointerout', this.onPointerOut);
            this.scene.input.setDefaultCursor('default');
        }
    }

    setDragVisual (active: boolean): void
    {
        this.gameObject.setAlpha(active ? 0.88 : 1);
        this.gameObject.setScale(active ? 1.1 : 1);
        this.gameObject.setDepth(active ? 25 : 5);
    }

    playAttackPulse (): void
    {
        const scene = this.gameObject.scene;

        if (!scene)
        {
            return;
        }

        scene.tweens.add({
            targets: this.gameObject,
            scaleX: 1.12,
            scaleY: 1.12,
            duration: 90,
            yoyo: true,
            ease: 'Quad.easeOut',
        });
    }

    destroy (): void
    {
        this.gameObject.destroy();
    }
}
