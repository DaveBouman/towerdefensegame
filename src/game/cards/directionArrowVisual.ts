import type Phaser from 'phaser';
import type { CardDirection } from '../cardGame/domain/cardDirections';
import { arrowRotationDeg } from './cardArrows';
import {
    DIRECTION_ARROW_TEXTURE_KEY,
    DIRECTION_LOOP_TEXTURE_KEY,
} from '../../ui/icons/directionIcons';

export interface DirectionArrowOptions {
    size: number;
    tint?: number;
    alpha?: number;
}

/** Creates a rotated direction arrow image when the texture is loaded; otherwise null. */
export const createDirectionArrowImage = (
    scene: Phaser.Scene,
    direction: CardDirection,
    options: DirectionArrowOptions,
): Phaser.GameObjects.Image | null =>
{
    if (!scene.textures.exists(DIRECTION_ARROW_TEXTURE_KEY))
    {
        return null;
    }

    const image = scene.add.image(0, 0, DIRECTION_ARROW_TEXTURE_KEY);
    image.setDisplaySize(options.size, options.size);
    image.setOrigin(0.5);
    image.setAngle(arrowRotationDeg(direction));
    image.setAlpha(options.alpha ?? 1);

    if (options.tint !== undefined)
    {
        image.setTint(options.tint);
    }

    return image;
};

export const createLoopBadgeImage = (
    scene: Phaser.Scene,
    options: DirectionArrowOptions,
): Phaser.GameObjects.Image | null =>
{
    if (!scene.textures.exists(DIRECTION_LOOP_TEXTURE_KEY))
    {
        return null;
    }

    const image = scene.add.image(0, 0, DIRECTION_LOOP_TEXTURE_KEY);
    image.setDisplaySize(options.size, options.size);
    image.setOrigin(0.5);
    image.setAlpha(options.alpha ?? 1);

    if (options.tint !== undefined)
    {
        image.setTint(options.tint);
    }

    return image;
};
