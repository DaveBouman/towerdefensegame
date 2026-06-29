import type { CardVisualTarget } from './types';

/** Adds a highlight rectangle on top of the card so it is not hidden by the card body. */
export const addCardOverlay = (
    scene: Phaser.Scene,
    target: CardVisualTarget,
    width: number,
    height: number,
    fill: number,
    fillAlpha: number,
    stroke: number,
    strokeWidth: number,
): Phaser.GameObjects.Rectangle =>
{
    const overlay = scene.add.rectangle(
        target.width / 2,
        target.height / 2,
        width,
        height,
        fill,
        fillAlpha,
    );

    overlay.setStrokeStyle(strokeWidth, stroke, 1);
    target.wrapper.add(overlay);

    return overlay;
};

export const clearWrapperData = (
    wrapper: Phaser.GameObjects.Container,
    key: string,
): void =>
{
    wrapper.setData(key, undefined);
};
