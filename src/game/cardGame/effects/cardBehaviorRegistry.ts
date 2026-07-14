import { attackBehavior } from './attackBehavior';
import { battleModBehavior } from './battleModBehavior';
import { boostBehavior } from './boostBehavior';
import { curseBehavior } from './curseBehavior';
import { defendBehavior } from './defendBehavior';
import { echoBehavior } from './echoBehavior';
import { fireBehavior } from './fireBehavior';
import { hazardBehavior } from './hazardBehavior';
import { jokerBehavior } from './jokerBehavior';
import { loopResetBehavior } from './loopResetBehavior';
import { poisonBehavior } from './poisonBehavior';
import type { CardBehavior } from './types';

const behaviors = new Map<string, CardBehavior>([
    [ attackBehavior.id, attackBehavior ],
    [ battleModBehavior.id, battleModBehavior ],
    [ curseBehavior.id, curseBehavior ],
    [ boostBehavior.id, boostBehavior ],
    [ defendBehavior.id, defendBehavior ],
    [ echoBehavior.id, echoBehavior ],
    [ fireBehavior.id, fireBehavior ],
    [ hazardBehavior.id, hazardBehavior ],
    [ jokerBehavior.id, jokerBehavior ],
    [ loopResetBehavior.id, loopResetBehavior ],
    [ poisonBehavior.id, poisonBehavior ],
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
