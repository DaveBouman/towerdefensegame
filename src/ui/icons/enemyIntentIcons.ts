import type { EnemyTurnKind } from '../../game/cardGame/domain/types';

import attackSvg from './000000/transparent/1x1/lorc/crossed-swords.svg?raw';
import shieldSvg from './000000/transparent/1x1/willdabeast/round-shield.svg?raw';
import trapSvg from './000000/transparent/1x1/lorc/land-mine.svg?raw';
import dampenSvg from './000000/transparent/1x1/delapouite/empty-chessboard.svg?raw';
import healSvg from './000000/transparent/1x1/zeromancer/heart-plus.svg?raw';
import { toWhiteIconSvg } from './toWhiteIconSvg';

/** Icons from https://game-icons.net (see src/ui/icons/license.txt). */
export const ENEMY_INTENT_TEXTURE_KEY: Record<EnemyTurnKind, string> = {
    attack: 'intent-icon-attack',
    shield: 'intent-icon-shield',
    'place-hazard': 'intent-icon-trap',
    'dampen-field': 'intent-icon-dampen-field',
    'battle-mod': 'intent-icon-battle-mod',
    'heal-ally': 'intent-icon-heal-ally',
    'shield-ally': 'intent-icon-shield-ally',
};

const ENEMY_INTENT_SVG_RAW: Record<EnemyTurnKind, string> = {
    attack: toWhiteIconSvg(attackSvg),
    shield: toWhiteIconSvg(shieldSvg),
    'place-hazard': toWhiteIconSvg(trapSvg),
    'dampen-field': toWhiteIconSvg(dampenSvg),
    'battle-mod': toWhiteIconSvg(dampenSvg),
    'heal-ally': toWhiteIconSvg(healSvg),
    'shield-ally': toWhiteIconSvg(shieldSvg),
};

export const ENEMY_INTENT_ICON_ENTRIES = (Object.keys(ENEMY_INTENT_TEXTURE_KEY) as EnemyTurnKind[]).map((id) => ({
    id,
    textureKey: ENEMY_INTENT_TEXTURE_KEY[id],
    svg: ENEMY_INTENT_SVG_RAW[id],
}));
