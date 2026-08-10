import type { CardDirection } from '../../game/cardGame/domain/cardDirections';
import { craftpixIconUrl } from './craftpixIconUrl';

/** Phaser texture for the shared chain-direction arrow (points down at 0°). */
export const DIRECTION_ARROW_TEXTURE_KEY = 'card-dir-arrow';

/** Phaser texture for loop-exit badge (used with a direction arrow). */
export const DIRECTION_LOOP_TEXTURE_KEY = 'card-dir-loop';

export const DIRECTION_ARROW_URL = craftpixIconUrl('dir-arrow.svg');
export const DIRECTION_LOOP_URL = craftpixIconUrl('dir-loop.svg');

/**
 * Clockwise degrees from the base icon (points down).
 * Phaser `setAngle` and CSS `rotate()` both use clockwise positive.
 */
export const DIRECTION_ARROW_ROTATION_DEG: Record<CardDirection, number> = {
    down: 0,
    'down-left': 45,
    left: 90,
    'up-left': 135,
    up: 180,
    'up-right': 225,
    right: 270,
    'down-right': 315,
};

export const DIRECTION_ICON_ENTRIES = [
    { textureKey: DIRECTION_ARROW_TEXTURE_KEY, url: DIRECTION_ARROW_URL },
    { textureKey: DIRECTION_LOOP_TEXTURE_KEY, url: DIRECTION_LOOP_URL },
] as const;
