import { describe, expect, it } from 'vitest';
import { hasAttackBetween, isTrailNeutralBehavior } from './chainTrailNeutrals';

describe('chainTrailNeutrals', () =>
{
    it('treats fire and poison as trail-neutral', () =>
    {
        expect(isTrailNeutralBehavior('fire')).toBe(true);
        expect(isTrailNeutralBehavior('poison')).toBe(true);
        expect(isTrailNeutralBehavior('attack')).toBe(false);
    });

    it('detects attacks between indices while skipping specials', () =>
    {
        const chain = [
            { behaviorId: 'poison' },
            { behaviorId: 'fire' },
            { behaviorId: 'attack' },
            { behaviorId: 'defend' },
        ];

        expect(hasAttackBetween(chain, 0, 3)).toBe(true);
        expect(hasAttackBetween(chain, 0, 2)).toBe(false);
    });
});
