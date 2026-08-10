import type { CombatTraitId } from '../../game/cardGame/combat/combatTraits/types';
import { craftpixIconUrl } from './craftpixIconUrl';

/** Phaser texture keys for combat trait icons. */
export const COMBAT_TRAIT_TEXTURE_KEY: Record<CombatTraitId, string> = {
    damageCap: 'combat-trait-damage-cap',
    hitWard: 'combat-trait-hit-ward',
};

const COMBAT_TRAIT_ICON_FILE: Record<CombatTraitId, string> = {
    damageCap: 'damage-cap.png',
    hitWard: 'hit-ward.png',
};

export const COMBAT_TRAIT_ICON_ENTRIES = (Object.keys(COMBAT_TRAIT_TEXTURE_KEY) as CombatTraitId[]).map((id) => ({
    id,
    textureKey: COMBAT_TRAIT_TEXTURE_KEY[id],
    url: craftpixIconUrl(COMBAT_TRAIT_ICON_FILE[id]),
}));
