import { addCardOverlay, clearWrapperData } from './cardOverlay';

const CURSE_GLOW = 0x8e44ad;
const CURSE_STROKE = 0x9b59b6;

const GLOW_DATA_KEY = 'card-visual-glow';
const TWEEN_KEY = 'curseGlowTween';

export const curseGlowVisual: import('./types').CardVisualEffect = {
    id: 'curse',
    activate (scene, target)
    {
        curseGlowVisual.deactivate(scene, target);

        const glow = addCardOverlay(
            scene,
            target,
            target.width + 14,
            target.height + 14,
            CURSE_GLOW,
            0.22,
            CURSE_STROKE,
            4,
        );

        glow.setName('card-visual-glow');
        target.wrapper.setData(GLOW_DATA_KEY, glow);

        const tween = scene.tweens.add({
            targets: glow,
            alpha: { from: 0.35, to: 0.9 },
            duration: 320,
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
