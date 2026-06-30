import { addCardOverlay, clearWrapperData } from './cardOverlay';

const FIRE_GLOW = 0xe67e22;
const FIRE_STROKE = 0xf39c12;

const GLOW_DATA_KEY = 'card-visual-glow';
const TWEEN_KEY = 'fireGlowTween';

export const fireGlowVisual: import('./types').CardVisualEffect = {
    id: 'fire',
    activate (scene, target)
    {
        fireGlowVisual.deactivate(scene, target);

        const glow = addCardOverlay(
            scene,
            target,
            target.width + 14,
            target.height + 14,
            FIRE_GLOW,
            0.28,
            FIRE_STROKE,
            4,
        );

        glow.setName('card-visual-glow');
        target.wrapper.setData(GLOW_DATA_KEY, glow);

        const tween = scene.tweens.add({
            targets: glow,
            alpha: { from: 0.5, to: 1 },
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
