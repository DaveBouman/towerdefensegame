import { addCardOverlay, clearWrapperData } from './cardOverlay';
import { playCardGlowPulse, resetCardGlowPulse } from './visualEffectTweens';

const ECHO_GLOW = 0x5ce1e6;
const ECHO_STROKE = 0xb8f8ff;

const GLOW_DATA_KEY = 'card-visual-glow';
const TWEEN_KEY = 'echoGlowTween';
const OVERLAY_TWEEN_KEY = 'echoOverlayTween';

export const echoGlowVisual: import('./types').CardVisualEffect = {
    id: 'echo',
    activate (scene, target)
    {
        echoGlowVisual.deactivate(scene, target);

        const glow = addCardOverlay(
            scene,
            target,
            target.width + 18,
            target.height + 18,
            ECHO_GLOW,
            0.24,
            ECHO_STROKE,
            5,
        );

        glow.setName('card-visual-glow');
        target.wrapper.setData(GLOW_DATA_KEY, glow);

        const { scaleTween, overlayTween } = playCardGlowPulse(scene, target.wrapper, glow, {
            scale: 1.1,
            duration: 320,
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

        const scaleTween = target.wrapper.getData(TWEEN_KEY) as Phaser.Tweens.Tween | undefined;
        const overlayTween = target.wrapper.getData(OVERLAY_TWEEN_KEY) as Phaser.Tweens.Tween | undefined;

        scaleTween?.stop();
        overlayTween?.stop();
        clearWrapperData(target.wrapper, TWEEN_KEY);
        clearWrapperData(target.wrapper, OVERLAY_TWEEN_KEY);

        resetCardGlowPulse(target.wrapper);
    },
};
