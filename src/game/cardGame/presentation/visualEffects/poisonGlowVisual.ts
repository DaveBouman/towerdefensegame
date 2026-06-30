import { addCardOverlay, clearWrapperData } from './cardOverlay';

const POISON_GLOW = 0x27ae60;
const POISON_STROKE = 0x58d68d;

const GLOW_DATA_KEY = 'card-visual-glow';
const TWEEN_KEY = 'poisonGlowTween';

export const poisonGlowVisual: import('./types').CardVisualEffect = {
    id: 'poison',
    activate (scene, target)
    {
        poisonGlowVisual.deactivate(scene, target);

        const glow = addCardOverlay(
            scene,
            target,
            target.width + 14,
            target.height + 14,
            POISON_GLOW,
            0.24,
            POISON_STROKE,
            4,
        );

        glow.setName('card-visual-glow');
        target.wrapper.setData(GLOW_DATA_KEY, glow);

        const tween = scene.tweens.add({
            targets: glow,
            alpha: { from: 0.45, to: 1 },
            duration: 280,
            yoyo: true,
            repeat: -1,
        });

        target.wrapper.setData(TWEEN_KEY, tween);

        return tween;
    },
    deactivate (scene, target)
    {
        const glow = target.wrapper.getData(GLOW_DATA_KEY) as Phaser.GameObjects.GameObject | undefined;

        glow?.destroy();
        clearWrapperData(target.wrapper, GLOW_DATA_KEY);

        const tween = target.wrapper.getData(TWEEN_KEY) as Phaser.Tweens.Tween | undefined;

        tween?.stop();
        clearWrapperData(target.wrapper, TWEEN_KEY);
        scene.tweens.killTweensOf(target.wrapper);
        target.wrapper.setScale(1);
    },
};
