import { describe, expect, it } from 'vitest';
import { CARD_BEHAVIOR_TEXTURE_KEY } from './cardBehaviorIcons';

describe('cardBehaviorIcons', () =>
{
    it('defines an icon texture for every card behavior', () =>
    {
        const behaviors = [
            'attack',
            'defend',
            'joker',
            'hazard',
            'boost',
            'loop-reset',
            'poison',
            'fire',
            'curse',
            'fuse',
            'echo',
            'courier',
        ];

        for (const behaviorId of behaviors)
        {
            expect(CARD_BEHAVIOR_TEXTURE_KEY[behaviorId as keyof typeof CARD_BEHAVIOR_TEXTURE_KEY].length)
                .toBeGreaterThan(0);
        }
    });
});
