import type { EnemyTurnKind } from '../../game/cardGame/domain/types';
import { craftpixIconUrl } from './craftpixIconUrl';

/** Phaser texture keys for enemy intent icons. */
export const ENEMY_INTENT_TEXTURE_KEY: Record<EnemyTurnKind, string> = {
    attack: 'intent-icon-attack',
    shield: 'intent-icon-shield',
    'place-hazard': 'intent-icon-trap',
    'dampen-field': 'intent-icon-dampen-field',
    'lock-column': 'intent-icon-lock-column',
    'battle-mod': 'intent-icon-battle-mod',
    'heal-ally': 'intent-icon-heal-ally',
    'shield-ally': 'intent-icon-shield-ally',
};

const ENEMY_INTENT_ICON_FILE: Record<EnemyTurnKind, string> = {
    attack: 'intent-attack.png',
    shield: 'intent-shield.png',
    'place-hazard': 'intent-trap.png',
    'dampen-field': 'intent-dampen.png',
    'lock-column': 'intent-lock-column.png',
    'battle-mod': 'intent-battle-mod.png',
    'heal-ally': 'intent-heal.png',
    'shield-ally': 'intent-shield-ally.png',
};

export const ENEMY_INTENT_ICON_ENTRIES = (Object.keys(ENEMY_INTENT_TEXTURE_KEY) as EnemyTurnKind[]).map((id) => ({
    id,
    textureKey: ENEMY_INTENT_TEXTURE_KEY[id],
    url: craftpixIconUrl(ENEMY_INTENT_ICON_FILE[id]),
}));
