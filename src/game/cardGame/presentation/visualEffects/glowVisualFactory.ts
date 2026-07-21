import { addCardOverlay, clearWrapperData } from './cardOverlay';
import type { CardVisualEffect, CardVisualTarget } from './types';
import { playCardGlowPulse, resetCardGlowPulse } from './visualEffectTweens';

const GLOW_DATA_KEY = 'card-visual-glow';

export interface PulseGlowConfig {
    id: string;
    fill: number;
    stroke: number;
    fillAlpha: number;
    pad: number;
    strokeWidth: number;
    scale: number;
    duration: number;
}

export interface AlphaGlowConfig {
    id: string;
    fill: number;
    stroke: number;
    fillAlpha: number;
    pad: number;
    strokeWidth: number;
    alphaFrom: number;
    alphaTo: number;
    duration: number;
    /** Phaser tween repeat: -1 forever, 1 = one yoyo cycle after start, etc. */
    repeat: number;
}

const dataKeys = (id: string) => ({
    tween: `${id}GlowTween`,
    overlay: `${id}OverlayTween`,
});

/** Card activation glow that pulses scale + overlay alpha. */
export const createPulseGlowVisual = (config: PulseGlowConfig): CardVisualEffect =>
{
    const keys = dataKeys(config.id);
    const effect: CardVisualEffect = {
        id: config.id,
        activate (scene, target)
        {
            effect.deactivate(scene, target);

            const glow = addCardOverlay(
                scene,
                target,
                target.width + config.pad,
                target.height + config.pad,
                config.fill,
                config.fillAlpha,
                config.stroke,
                config.strokeWidth,
            );

            glow.setName('card-visual-glow');
            target.wrapper.setData(GLOW_DATA_KEY, glow);

            const { scaleTween, overlayTween } = playCardGlowPulse(scene, target.wrapper, glow, {
                scale: config.scale,
                duration: config.duration,
                width: target.width,
                height: target.height,
            });

            target.wrapper.setData(keys.tween, scaleTween);
            target.wrapper.setData(keys.overlay, overlayTween);

            return scaleTween;
        },
        deactivate (_scene, target)
        {
            destroyStoredGlow(target);
            stopStoredTween(target, keys.tween);
            stopStoredTween(target, keys.overlay);
            resetCardGlowPulse(target.wrapper);
        },
    };

    return effect;
};

/** Card activation glow that only pulses overlay alpha (no card scale). */
export const createAlphaGlowVisual = (config: AlphaGlowConfig): CardVisualEffect =>
{
    const keys = dataKeys(config.id);
    const effect: CardVisualEffect = {
        id: config.id,
        activate (scene, target)
        {
            effect.deactivate(scene, target);

            const glow = addCardOverlay(
                scene,
                target,
                target.width + config.pad,
                target.height + config.pad,
                config.fill,
                config.fillAlpha,
                config.stroke,
                config.strokeWidth,
            );

            glow.setName('card-visual-glow');
            target.wrapper.setData(GLOW_DATA_KEY, glow);

            const tween = scene.tweens.add({
                targets: glow,
                alpha: { from: config.alphaFrom, to: config.alphaTo },
                duration: config.duration,
                yoyo: true,
                repeat: config.repeat,
            });

            target.wrapper.setData(keys.tween, tween);

            return tween;
        },
        deactivate (scene, target)
        {
            destroyStoredGlow(target);
            stopStoredTween(target, keys.tween);
            scene.tweens.killTweensOf(target.wrapper);
            target.wrapper.setScale(1);
        },
    };

    return effect;
};

const destroyStoredGlow = (target: CardVisualTarget): void =>
{
    const glow = target.wrapper.getData(GLOW_DATA_KEY) as Phaser.GameObjects.GameObject | undefined;

    glow?.destroy();
    clearWrapperData(target.wrapper, GLOW_DATA_KEY);
};

const stopStoredTween = (target: CardVisualTarget, key: string): void =>
{
    const tween = target.wrapper.getData(key) as Phaser.Tweens.Tween | undefined;

    tween?.stop();
    clearWrapperData(target.wrapper, key);
};
