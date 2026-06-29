import { attackBehavior } from './attackBehavior';
import { defendBehavior } from './defendBehavior';
import { jokerBehavior } from './jokerBehavior';
import type { CardBehavior } from './types';

const behaviors = new Map<string, CardBehavior>([
    [ attackBehavior.id, attackBehavior ],
    [ defendBehavior.id, defendBehavior ],
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
