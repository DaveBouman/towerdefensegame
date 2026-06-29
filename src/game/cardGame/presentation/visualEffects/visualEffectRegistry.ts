import { attackGlowVisual } from './attackGlowVisual';
import { defendGlowVisual } from './defendGlowVisual';
import type { CardVisualEffect } from './types';

const effects = new Map<string, CardVisualEffect>([
    [ attackGlowVisual.id, attackGlowVisual ],
    [ defendGlowVisual.id, defendGlowVisual ],
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
