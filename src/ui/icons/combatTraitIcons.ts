import type { CombatTraitId } from '../../game/cardGame/combat/combatTraits/types';
import { toWhiteIconSvg } from './toWhiteIconSvg';
import crackedShieldSvg from './000000/transparent/1x1/lorc/cracked-shield.svg?raw';
import shieldReflectSvg from './000000/transparent/1x1/lorc/shield-reflect.svg?raw';

/** Icons from https://game-icons.net (see src/ui/icons/license.txt). */
export const COMBAT_TRAIT_TEXTURE_KEY: Record<CombatTraitId, string> = {
    damageCap: 'combat-trait-damage-cap',
    hitWard: 'combat-trait-hit-ward',
};

const COMBAT_TRAIT_SVG_RAW: Record<CombatTraitId, string> = {
    damageCap: toWhiteIconSvg(crackedShieldSvg),
    hitWard: toWhiteIconSvg(shieldReflectSvg),
};

export const COMBAT_TRAIT_ICON_ENTRIES = (Object.keys(COMBAT_TRAIT_TEXTURE_KEY) as CombatTraitId[]).map((id) => ({
    id,
    textureKey: COMBAT_TRAIT_TEXTURE_KEY[id],
    svg: COMBAT_TRAIT_SVG_RAW[id],
}));
