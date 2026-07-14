import { uiTextStyle } from '../../../config/uiTypography';
import { clearWrapperData } from './cardOverlay';

export interface CardGlowPulseTweens {
    scaleTween: Phaser.Tweens.Tween;
    overlayTween: Phaser.Tweens.Tween;
}

const PULSE_ORIGIN_X = 'glowPulseOriginX';
const PULSE_ORIGIN_Y = 'glowPulseOriginY';

/** Restores wrapper position/scale after a centered pulse tween. */
export const resetCardGlowPulse = (wrapper: Phaser.GameObjects.Container): void =>
{
    const originX = wrapper.getData(PULSE_ORIGIN_X) as number | undefined;
    const originY = wrapper.getData(PULSE_ORIGIN_Y) as number | undefined;

    wrapper.scene.tweens.killTweensOf(wrapper);
    wrapper.setScale(1);

    if (originX !== undefined && originY !== undefined)
    {
        wrapper.setPosition(originX, originY);
    }

    clearWrapperData(wrapper, PULSE_ORIGIN_X);
    clearWrapperData(wrapper, PULSE_ORIGIN_Y);
};

export const playCardGlowPulse = (
    scene: Phaser.Scene,
    wrapper: Phaser.GameObjects.Container,
    glow: Phaser.GameObjects.GameObject,
    options: { scale?: number; duration?: number; width: number; height: number },
): CardGlowPulseTweens =>
{
    const scaleMax = options.scale ?? 1.06;
    const duration = options.duration ?? 360;
    const halfW = options.width / 2;
    const halfH = options.height / 2;

    resetCardGlowPulse(wrapper);

    const baseX = wrapper.x;
    const baseY = wrapper.y;

    wrapper.setData(PULSE_ORIGIN_X, baseX);
    wrapper.setData(PULSE_ORIGIN_Y, baseY);

    const offsetX = halfW * (scaleMax - 1);
    const offsetY = halfH * (scaleMax - 1);

    const scaleTween = scene.tweens.add({
        targets: wrapper,
        scaleX: { from: 1, to: scaleMax },
        scaleY: { from: 1, to: scaleMax },
        x: { from: baseX, to: baseX - offsetX },
        y: { from: baseY, to: baseY - offsetY },
        duration,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1,
    });

    const overlayTween = scene.tweens.add({
        targets: glow,
        alpha: { from: 0.32, to: 0.95 },
        duration: duration * 0.85,
        ease: 'Cubic.easeInOut',
        yoyo: true,
        repeat: -1,
    });

    return { scaleTween, overlayTween };
};

export const playHitFlash = (
    scene: Phaser.Scene,
    container: Phaser.GameObjects.Container,
    body: Phaser.GameObjects.Rectangle,
    restoreColor: number,
    options: { peakScale?: number; restoreAlpha?: number } = {},
): void =>
{
    const peakScale = options.peakScale ?? 1.12;
    const restoreAlpha = options.restoreAlpha ?? 1;

    scene.tweens.killTweensOf(container);
    container.setScale(1);
    body.setFillStyle(0xffffff, 0.98);

    scene.tweens.add({
        targets: container,
        scaleX: peakScale,
        scaleY: peakScale,
        duration: 80,
        ease: 'Back.easeOut',
        yoyo: true,
        onComplete: () =>
        {
            body.setFillStyle(restoreColor, restoreAlpha);
        },
    });
};

export const playFloatingText = (
    scene: Phaser.Scene,
    parent: Phaser.GameObjects.Container,
    x: number,
    y: number,
    text: string,
    color: string,
): void =>
{
    const popup = scene.add.text(x, y, text, {
        ...uiTextStyle(26, color, { bold: true, strokeColor: '#020408' }),
    }).setOrigin(0.5, 1).setAlpha(0);

    parent.add(popup);

    scene.tweens.add({
        targets: popup,
        alpha: 1,
        y: y - 10,
        duration: 110,
        ease: 'Quad.easeOut',
        onComplete: () =>
        {
            scene.tweens.add({
                targets: popup,
                y: y - 48,
                alpha: 0,
                scaleX: 1.12,
                scaleY: 1.12,
                duration: 620,
                ease: 'Cubic.easeIn',
                onComplete: () => popup.destroy(),
            });
        },
    });
};
