import { addCardOverlay, clearWrapperData } from './cardOverlay';
import { playCardGlowPulse, resetCardGlowPulse } from './visualEffectTweens';

const FUSE_GLOW = 0xff6b35;
const FUSE_STROKE = 0xff9f43;

const GLOW_DATA_KEY = 'card-visual-glow';
const TWEEN_KEY = 'fuseGlowTween';
const SCALE_TWEEN_KEY = 'fuseScaleTween';

export const fuseGlowVisual: import('./types').CardVisualEffect = {
    id: 'fuse',
    activate (scene, target)
    {
        fuseGlowVisual.deactivate(scene, target);

        const glow = addCardOverlay(
            scene,
            target,
            target.width + 16,
            target.height + 16,
            FUSE_GLOW,
            0.3,
            FUSE_STROKE,
            4,
        );

        glow.setName('card-visual-glow');
        target.wrapper.setData(GLOW_DATA_KEY, glow);

        const { scaleTween, overlayTween } = playCardGlowPulse(scene, target.wrapper, glow, {
            scale: 1.08,
            duration: 180,
            width: target.width,
            height: target.height,
        });

        target.wrapper.setData(TWEEN_KEY, overlayTween);
        target.wrapper.setData(SCALE_TWEEN_KEY, scaleTween);

        return overlayTween;
    },
    deactivate (scene, target)
    {
        const glow = target.wrapper.getData(GLOW_DATA_KEY) as Phaser.GameObjects.GameObject | undefined;

        glow?.destroy();
        clearWrapperData(target.wrapper, GLOW_DATA_KEY);

        const glowTween = target.wrapper.getData(TWEEN_KEY) as Phaser.Tweens.Tween | undefined;
        const scaleTween = target.wrapper.getData(SCALE_TWEEN_KEY) as Phaser.Tweens.Tween | undefined;

        glowTween?.stop();
        scaleTween?.stop();
        clearWrapperData(target.wrapper, TWEEN_KEY);
        clearWrapperData(target.wrapper, SCALE_TWEEN_KEY);

        resetCardGlowPulse(target.wrapper);
    },
};
