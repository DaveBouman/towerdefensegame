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
    | 'courier';

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
};

export const CARD_BEHAVIOR_ICON_ENTRIES = (Object.keys(CARD_BEHAVIOR_TEXTURE_KEY) as CardBehaviorIconId[]).map((id) => ({
    id,
    textureKey: CARD_BEHAVIOR_TEXTURE_KEY[id],
    url: craftpixIconUrl(CARD_BEHAVIOR_ICON_FILE[id]),
}));

export const getCardBehaviorTextureKey = (behaviorId: string): string | null =>
    behaviorId in CARD_BEHAVIOR_TEXTURE_KEY
        ? CARD_BEHAVIOR_TEXTURE_KEY[behaviorId as CardBehaviorIconId]
        : null;

export const getCardBehaviorIconUrl = (behaviorId: string): string | null =>
    behaviorId in CARD_BEHAVIOR_ICON_FILE
        ? craftpixIconUrl(CARD_BEHAVIOR_ICON_FILE[behaviorId as CardBehaviorIconId])
        : null;
