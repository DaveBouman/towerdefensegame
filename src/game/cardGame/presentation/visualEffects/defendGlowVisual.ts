import { addCardOverlay, clearWrapperData } from './cardOverlay';

const DEFEND_GLOW = 0x2ecc71;
const DEFEND_STROKE = 0xa8e6cf;

const GLOW_DATA_KEY = 'card-visual-glow';
const TWEEN_KEY = 'defendGlowTween';
const OVERLAY_TWEEN_KEY = 'defendOverlayTween';

export const defendGlowVisual: import('./types').CardVisualEffect = {
    id: 'defend',
    activate (scene, target)
    {
        defendGlowVisual.deactivate(scene, target);

        const glow = addCardOverlay(
            scene,
            target,
            target.width + 18,
            target.height + 18,
            DEFEND_GLOW,
            0.18,
            DEFEND_STROKE,
            5,
        );

        glow.setName('card-visual-glow');
        target.wrapper.setData(GLOW_DATA_KEY, glow);

        scene.tweens.killTweensOf(target.wrapper);
        target.wrapper.setScale(1);

        const scaleTween = scene.tweens.add({
            targets: target.wrapper,
            scaleX: 1.12,
            scaleY: 1.12,
            duration: 280,
            yoyo: true,
            repeat: -1,
        });

        const overlayTween = scene.tweens.add({
            targets: glow,
            alpha: { from: 0.55, to: 1 },
            duration: 280,
            yoyo: true,
            repeat: -1,
        });

        target.wrapper.setData(TWEEN_KEY, scaleTween);
        target.wrapper.setData(OVERLAY_TWEEN_KEY, overlayTween);

        return scaleTween;
    },
    deactivate (scene, target)
    {
        const glow = target.wrapper.getData(GLOW_DATA_KEY) as Phaser.GameObjects.GameObject | undefined;

        glow?.destroy();
        clearWrapperData(target.wrapper, GLOW_DATA_KEY);

        const scaleTween = target.wrapper.getData(TWEEN_KEY) as Phaser.Tweens.Tween | undefined;
        const overlayTween = target.wrapper.getData(OVERLAY_TWEEN_KEY) as Phaser.Tweens.Tween | undefined;

        scaleTween?.stop();
        overlayTween?.stop();
        clearWrapperData(target.wrapper, TWEEN_KEY);
        clearWrapperData(target.wrapper, OVERLAY_TWEEN_KEY);

        scene.tweens.killTweensOf(target.wrapper);
        target.wrapper.setScale(1);
    },
};
