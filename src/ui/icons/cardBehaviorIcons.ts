import attackSvg from './000000/transparent/1x1/lorc/crossed-swords.svg?raw';
import defendSvg from './000000/transparent/1x1/willdabeast/round-shield.svg?raw';
import jokerSvg from './000000/transparent/1x1/sbed/clover.svg?raw';
import hazardSvg from './000000/transparent/1x1/lorc/land-mine.svg?raw';
import boostSvg from './000000/transparent/1x1/sbed/doubled.svg?raw';
import loopSvg from './000000/transparent/1x1/lorc/cycle.svg?raw';
import poisonSvg from './000000/transparent/1x1/lorc/poison-bottle.svg?raw';
import fireSvg from './000000/transparent/1x1/sbed/fire.svg?raw';
import curseSvg from './000000/transparent/1x1/sbed/death-skull.svg?raw';
import fuseSvg from './000000/transparent/1x1/lorc/time-bomb.svg?raw';
import { toWhiteIconSvg } from './toWhiteIconSvg';

/** Card behavior ids from cards.json / CARD_VISUALS. */
export type CardBehaviorIconId =
    | 'attack'
    | 'defend'
    | 'joker'
    | 'hazard'
    | 'boost'
    | 'loop-reset'
    | 'poison'
    | 'fire'
    | 'curse'
    | 'fuse';

/** Icons from https://game-icons.net (see src/ui/icons/license.txt). */
export const CARD_BEHAVIOR_TEXTURE_KEY: Record<CardBehaviorIconId, string> = {
    attack: 'card-icon-attack',
    defend: 'card-icon-defend',
    joker: 'card-icon-joker',
    hazard: 'card-icon-hazard',
    boost: 'card-icon-boost',
    'loop-reset': 'card-icon-loop',
    poison: 'card-icon-poison',
    fire: 'card-icon-fire',
    curse: 'card-icon-curse',
    fuse: 'card-icon-fuse',
};

const CARD_BEHAVIOR_SVG_RAW: Record<CardBehaviorIconId, string> = {
    attack: toWhiteIconSvg(attackSvg),
    defend: toWhiteIconSvg(defendSvg),
    joker: toWhiteIconSvg(jokerSvg),
    hazard: toWhiteIconSvg(hazardSvg),
    boost: toWhiteIconSvg(boostSvg),
    'loop-reset': toWhiteIconSvg(loopSvg),
    poison: toWhiteIconSvg(poisonSvg),
    fire: toWhiteIconSvg(fireSvg),
    curse: toWhiteIconSvg(curseSvg),
    fuse: toWhiteIconSvg(fuseSvg),
};

export const CARD_BEHAVIOR_ICON_ENTRIES = (Object.keys(CARD_BEHAVIOR_TEXTURE_KEY) as CardBehaviorIconId[]).map((id) => ({
    id,
    textureKey: CARD_BEHAVIOR_TEXTURE_KEY[id],
    svg: CARD_BEHAVIOR_SVG_RAW[id],
}));

export const getCardBehaviorTextureKey = (behaviorId: string): string | null =>
    behaviorId in CARD_BEHAVIOR_TEXTURE_KEY
        ? CARD_BEHAVIOR_TEXTURE_KEY[behaviorId as CardBehaviorIconId]
        : null;
