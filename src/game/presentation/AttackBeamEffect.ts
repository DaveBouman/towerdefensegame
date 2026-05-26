import { GameObjects } from 'phaser';
import type { Scene } from 'phaser';
import type { WorldPosition } from '../grid/types';
import { canAddToScene } from './sceneReady';

export interface AttackBeamColors
{
    beam: number;
    impact: number;
}

const EFFECTS_DEPTH = 15;

export class AttackBeamEffect
{
    private layer: GameObjects.Container | null = null;

    play (
        scene: Scene,
        from: WorldPosition,
        to: WorldPosition,
        colors: AttackBeamColors,
    ): void
    {
        const layer = this.getLayer(scene);

        if (!layer)
        {
            return;
        }

        const beam = new GameObjects.Graphics(scene);

        beam.lineStyle(3, colors.beam, 1);
        beam.beginPath();
        beam.moveTo(from.x, from.y);
        beam.lineTo(to.x, to.y);
        beam.strokePath();
        layer.add(beam);

        const impact = new GameObjects.Arc(
            scene,
            to.x,
            to.y,
            10,
            0,
            360,
            false,
            colors.impact,
            0.85,
        );

        layer.add(impact);

        scene.tweens.add({
            targets: [ beam, impact ],
            alpha: 0,
            duration: 180,
            ease: 'Quad.easeOut',
            onComplete: () =>
            {
                beam.destroy();
                impact.destroy();
            },
        });
    }

    destroy (): void
    {
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
            this.layer.setDepth(EFFECTS_DEPTH);
        }

        return this.layer;
    }
}
