import { attackGlowVisual } from './attackGlowVisual';
import { boostGlowVisual } from './boostGlowVisual';
import { courierGlowVisual } from './courierGlowVisual';
import { curseGlowVisual } from './curseGlowVisual';
import { defendGlowVisual } from './defendGlowVisual';
import { fireGlowVisual } from './fireGlowVisual';
import { fuseGlowVisual } from './fuseGlowVisual';
import { hazardGlowVisual } from './hazardGlowVisual';
import { jokerGlowVisual } from './jokerGlowVisual';
import { loopResetGlowVisual } from './loopResetGlowVisual';
import { poisonGlowVisual } from './poisonGlowVisual';
import type { CardVisualEffect } from './types';

const effects = new Map<string, CardVisualEffect>([
    [ attackGlowVisual.id, attackGlowVisual ],
    [ boostGlowVisual.id, boostGlowVisual ],
    [ courierGlowVisual.id, courierGlowVisual ],
    [ defendGlowVisual.id, defendGlowVisual ],
    [ fireGlowVisual.id, fireGlowVisual ],
    [ hazardGlowVisual.id, hazardGlowVisual ],
    [ jokerGlowVisual.id, jokerGlowVisual ],
    [ loopResetGlowVisual.id, loopResetGlowVisual ],
    [ poisonGlowVisual.id, poisonGlowVisual ],
    [ fuseGlowVisual.id, fuseGlowVisual ],
    [ curseGlowVisual.id, curseGlowVisual ],
]);

export const registerCardVisualEffect = (effect: CardVisualEffect): void =>
{
    effects.set(effect.id, effect);
};

export const getCardVisualEffect = (id: string): CardVisualEffect | undefined =>
    effects.get(id);

export const getCardVisualEffectOrThrow = (id: string): CardVisualEffect =>
{
    const effect = getCardVisualEffect(id);

    if (!effect)
    {
        throw new Error(`Unknown card visual effect: ${id}`);
    }

    return effect;
};
