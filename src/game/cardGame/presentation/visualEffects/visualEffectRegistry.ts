import { attackGlowVisual } from './attackGlowVisual';
import { boostGlowVisual } from './boostGlowVisual';
import { courierGlowVisual } from './courierGlowVisual';
import { curseGlowVisual } from './curseGlowVisual';
import { defendGlowVisual } from './defendGlowVisual';
import { echoGlowVisual } from './echoGlowVisual';
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
    [ echoGlowVisual.id, echoGlowVisual ],
    [ fireGlowVisual.id, fireGlowVisual ],
    [ hazardGlowVisual.id, hazardGlowVisual ],
    [ jokerGlowVisual.id, jokerGlowVisual ],
    [ loopResetGlowVisual.id, loopResetGlowVisual ],
    [ poisonGlowVisual.id, poisonGlowVisual ],
    [ fuseGlowVisual.id, fuseGlowVisual ],
    [ curseGlowVisual.id, curseGlowVisual ],
]);

const VISUAL_ALIASES: Record<string, string> = {
    shiv: 'attack',
    lacerate: 'attack',
    miasma: 'poison',
    cinder: 'fire',
    scorch: 'fire',
    bramble: 'defend',
    glitch: 'joker',
    hardwire: 'defend',
    patch: 'boost',
    overclock: 'fire',
    salvage: 'attack',
};

for (const [ alias, baseId ] of Object.entries(VISUAL_ALIASES))
{
    const base = effects.get(baseId);

    if (base)
    {
        effects.set(alias, { ...base, id: alias });
    }
}

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
