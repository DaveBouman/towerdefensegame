import { addCardOverlay, clearWrapperData } from './cardOverlay';
import { playCardGlowPulse, resetCardGlowPulse } from './visualEffectTweens';

const GLOW_DATA_KEY = 'card-visual-glow';
const TWEEN_KEY = 'fireGlowTween';
const OVERLAY_TWEEN_KEY = 'fireOverlayTween';

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
            0xff6b35,
            0.3,
            0xff9f43,
            4,
        );

        glow.setName('card-visual-glow');
        target.wrapper.setData(GLOW_DATA_KEY, glow);

        const { scaleTween, overlayTween } = playCardGlowPulse(scene, target.wrapper, glow, {
            scale: 1.05,
            duration: 280,
            width: target.width,
            height: target.height,
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

        const tween = target.wrapper.getData(TWEEN_KEY) as Phaser.Tweens.Tween | undefined;
        const overlayTween = target.wrapper.getData(OVERLAY_TWEEN_KEY) as Phaser.Tweens.Tween | undefined;

        tween?.stop();
        overlayTween?.stop();
        clearWrapperData(target.wrapper, TWEEN_KEY);
        clearWrapperData(target.wrapper, OVERLAY_TWEEN_KEY);
        resetCardGlowPulse(target.wrapper);
    },
};
