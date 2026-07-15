import type { CombatTraitConfig } from './types';
import { COMBAT_TRAIT_TEXTURE_KEY } from '../../../../ui/icons/combatTraitIcons';

export interface CombatTraitTooltipContent {
    title: string;
    lines: string[];
}

export const resolveCombatTraitTooltip = (
    trait: CombatTraitConfig,
): CombatTraitTooltipContent =>
{
    switch (trait.id)
    {
        case 'damageCap':
            return {
                title: 'Damage Cap',
                lines: [
                    `Each card hit deals at most ${trait.maxPerCard} damage.`,
                ],
            };
        case 'hitWard':
            return {
                title: 'Hit Ward',
                lines: [
                    `The first ${trait.hitsBlocked} card hit(s) deal no damage.`,
                ],
            };
    }
};

export interface CombatTraitDisplayEntry {
    trait: CombatTraitConfig;
    textureKey: string;
    tint: number;
    tooltipTitle: string;
    tooltipLines: string[];
}

export const COMBAT_TRAIT_ROW_COLORS: Record<CombatTraitConfig['id'], number> = {
    damageCap: 0xbdc3c7,
    hitWard: 0x7f8c8d,
};

export const summarizeCombatTraits = (
    traits: readonly CombatTraitConfig[],
): CombatTraitDisplayEntry[] =>
    traits.map((trait) =>
    {
        const tooltip = resolveCombatTraitTooltip(trait);

        return {
            trait,
            textureKey: COMBAT_TRAIT_TEXTURE_KEY[trait.id],
            tint: COMBAT_TRAIT_ROW_COLORS[trait.id],
            tooltipTitle: tooltip.title,
            tooltipLines: tooltip.lines,
        };
    });
