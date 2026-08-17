import { craftpixIconUrl } from './craftpixIconUrl';

/** Card behavior ids from cards.json / CARD_VISUALS. */
export type CardBehaviorIconId =
    | 'attack'
    | 'defend'
    | 'joker'
    | 'hazard'
    | 'siphon'
    | 'boost'
    | 'loop-reset'
    | 'poison'
    | 'fire'
    | 'curse'
    | 'fuse'
    | 'echo'
    | 'courier'
    | 'thorns'
    | 'battle-mod';

/** Phaser texture keys for card behavior icons. */
export const CARD_BEHAVIOR_TEXTURE_KEY: Record<CardBehaviorIconId, string> = {
    attack: 'card-icon-attack',
    defend: 'card-icon-defend',
    joker: 'card-icon-joker',
    hazard: 'card-icon-hazard',
    siphon: 'card-icon-siphon',
    boost: 'card-icon-boost',
    'loop-reset': 'card-icon-loop',
    poison: 'card-icon-poison',
    fire: 'card-icon-fire',
    curse: 'card-icon-curse',
    fuse: 'card-icon-fuse',
    echo: 'card-icon-echo',
    courier: 'card-icon-courier',
    thorns: 'card-icon-thorns',
    'battle-mod': 'card-icon-battle-mod',
};

const CARD_BEHAVIOR_ICON_FILE: Record<CardBehaviorIconId, string> = {
    attack: 'attack.png',
    defend: 'defend.png',
    joker: 'joker.png',
    hazard: 'hazard.png',
    siphon: 'intent-heal.png',
    boost: 'boost.png',
    'loop-reset': 'loop.png',
    poison: 'poison.png',
    fire: 'fire.png',
    curse: 'curse.png',
    fuse: 'fuse.png',
    echo: 'echo.png',
    courier: 'courier.png',
    thorns: 'thorns.png',
    'battle-mod': 'intent-battle-mod.png',
};

/** Visual ids (and shared behaviors) that reuse another behavior's icon. */
const CARD_BEHAVIOR_ICON_ALIASES: Record<string, CardBehaviorIconId> = {
    shiv: 'attack',
    lacerate: 'attack',
    salvage: 'attack',
    switchback: 'attack',
    redline: 'attack',
    miasma: 'poison',
    cinder: 'fire',
    scorch: 'fire',
    bramble: 'defend',
    glitch: 'joker',
    hardwire: 'defend',
    patch: 'boost',
    overclock: 'fire',
};

const resolveCardBehaviorIconId = (id: string): CardBehaviorIconId | null =>
{
    if (id in CARD_BEHAVIOR_TEXTURE_KEY)
    {
        return id as CardBehaviorIconId;
    }

    return CARD_BEHAVIOR_ICON_ALIASES[id] ?? null;
};

export const CARD_BEHAVIOR_ICON_ENTRIES = (Object.keys(CARD_BEHAVIOR_TEXTURE_KEY) as CardBehaviorIconId[]).map((id) => ({
    id,
    textureKey: CARD_BEHAVIOR_TEXTURE_KEY[id],
    url: craftpixIconUrl(CARD_BEHAVIOR_ICON_FILE[id]),
}));

export const getCardBehaviorTextureKey = (behaviorId: string): string | null =>
{
    const resolved = resolveCardBehaviorIconId(behaviorId);

    return resolved ? CARD_BEHAVIOR_TEXTURE_KEY[resolved] : null;
};

export const getCardBehaviorIconUrl = (behaviorId: string): string | null =>
{
    const resolved = resolveCardBehaviorIconId(behaviorId);

    return resolved ? craftpixIconUrl(CARD_BEHAVIOR_ICON_FILE[resolved]) : null;
};
