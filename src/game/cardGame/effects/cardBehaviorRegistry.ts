import { attackBehavior } from './attackBehavior';
import { boostBehavior } from './boostBehavior';
import { defendBehavior } from './defendBehavior';
import { hazardBehavior } from './hazardBehavior';
import { jokerBehavior } from './jokerBehavior';
import type { CardBehavior } from './types';

const behaviors = new Map<string, CardBehavior>([
    [ attackBehavior.id, attackBehavior ],
    [ boostBehavior.id, boostBehavior ],
    [ defendBehavior.id, defendBehavior ],
    [ hazardBehavior.id, hazardBehavior ],
    [ jokerBehavior.id, jokerBehavior ],
]);

export const registerCardBehavior = (behavior: CardBehavior): void =>
{
    behaviors.set(behavior.id, behavior);
};

export const getCardBehavior = (id: string): CardBehavior | undefined =>
    behaviors.get(id);

export const getCardBehaviorOrThrow = (id: string): CardBehavior =>
{
    const behavior = getCardBehavior(id);

    if (!behavior)
    {
        throw new Error(`Unknown card behavior: ${id}`);
    }

    return behavior;
};
