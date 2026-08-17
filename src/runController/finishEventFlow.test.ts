import { describe, expect, it } from 'vitest';
import { planFinishEvent } from './finishEventFlow';

describe('finishEventFlow', () =>
{
    it('flags new arrowless cards for direction picks', () =>
    {
        const plan = planFinishEvent(
            [ { definitionId: 'attack', arrow: 'left' } ],
            {
                playerHealth: 40,
                gold: 25,
                deck: [
                    { definitionId: 'attack', arrow: 'left' },
                    { definitionId: 'fuse' },
                ],
                bodyMods: [],
                messages: [],
            },
        );

        expect(plan.gold).toBe(25);
        expect(plan.needingDirection).toEqual([ 'fuse' ]);
        expect(plan.unlockCardIds).toEqual([ 'attack', 'fuse' ]);
    });

    it('skips direction flow when nothing new needs an arrow', () =>
    {
        const plan = planFinishEvent(
            [ { definitionId: 'attack', arrow: 'left' } ],
            {
                playerHealth: 40,
                gold: 0,
                deck: [ { definitionId: 'attack', arrow: 'left' } ],
                bodyMods: [],
                messages: [],
            },
        );

        expect(plan.needingDirection).toEqual([]);
    });
});
