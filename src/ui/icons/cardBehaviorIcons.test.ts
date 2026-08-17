import { describe, expect, it } from 'vitest';
import {
    CARD_BEHAVIOR_TEXTURE_KEY,
    getCardBehaviorIconUrl,
    getCardBehaviorTextureKey,
} from './cardBehaviorIcons';

describe('cardBehaviorIcons', () =>
{
    it('defines an icon texture for every card behavior', () =>
    {
        const behaviors = [
            'attack',
            'defend',
            'joker',
            'hazard',
            'siphon',
            'boost',
            'loop-reset',
            'poison',
            'fire',
            'curse',
            'fuse',
            'echo',
            'courier',
            'thorns',
            'battle-mod',
        ];

        for (const behaviorId of behaviors)
        {
            expect(CARD_BEHAVIOR_TEXTURE_KEY[behaviorId as keyof typeof CARD_BEHAVIOR_TEXTURE_KEY].length)
                .toBeGreaterThan(0);
        }
    });

    it('maps Hardwire and other visual ids onto existing behavior icons', () =>
    {
        expect(getCardBehaviorTextureKey('hardwire')).toBe(CARD_BEHAVIOR_TEXTURE_KEY.defend);
        expect(getCardBehaviorIconUrl('hardwire')).toContain('defend.png');
        expect(getCardBehaviorTextureKey('battle-mod')).toBe(CARD_BEHAVIOR_TEXTURE_KEY['battle-mod']);
        expect(getCardBehaviorIconUrl('glitch')).toContain('joker.png');
        expect(getCardBehaviorIconUrl('patch')).toContain('boost.png');
        expect(getCardBehaviorIconUrl('overclock')).toContain('fire.png');
    });
});
