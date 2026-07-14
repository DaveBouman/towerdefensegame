import { addCardOverlay, clearWrapperData } from './cardOverlay';

const COURIER_GLOW = 0x3498db;
const COURIER_STROKE = 0xaed6f1;

const GLOW_DATA_KEY = 'card-visual-glow';
const TWEEN_KEY = 'courierGlowTween';

export const courierGlowVisual: import('./types').CardVisualEffect = {
    id: 'courier',
    activate (scene, target)
    {
        courierGlowVisual.deactivate(scene, target);

        const glow = addCardOverlay(
            scene,
            target,
            target.width + 14,
            target.height + 14,
            COURIER_GLOW,
            0.22,
            COURIER_STROKE,
            4,
        );

        glow.setName('card-visual-glow');
        target.wrapper.setData(GLOW_DATA_KEY, glow);

        const tween = scene.tweens.add({
            targets: glow,
            alpha: { from: 0.45, to: 1 },
            duration: 260,
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
