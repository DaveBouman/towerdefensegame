import { describe, expect, it } from 'vitest';
import { CARD_DIRECTIONS } from '../../game/cardGame/domain/cardDirections';
import {
    DIRECTION_ARROW_ROTATION_DEG,
    DIRECTION_ARROW_TEXTURE_KEY,
    DIRECTION_ICON_ENTRIES,
} from './directionIcons';

describe('directionIcons', () =>
{
    it('maps every card direction to a rotation', () =>
    {
        for (const direction of CARD_DIRECTIONS)
        {
            expect(DIRECTION_ARROW_ROTATION_DEG[direction]).toEqual(expect.any(Number));
        }

        expect(DIRECTION_ARROW_ROTATION_DEG.down).toBe(0);
        expect(DIRECTION_ARROW_ROTATION_DEG.right).toBe(270);
        expect(DIRECTION_ARROW_ROTATION_DEG.up).toBe(180);
        expect(DIRECTION_ARROW_ROTATION_DEG.left).toBe(90);
    });

    it('registers arrow + loop textures for preload', () =>
    {
        expect(DIRECTION_ICON_ENTRIES.map((entry) => entry.textureKey)).toContain(
            DIRECTION_ARROW_TEXTURE_KEY,
        );
        expect(DIRECTION_ICON_ENTRIES).toHaveLength(2);
    });
});
