import { resolveCombatTraitTooltip } from '../../combat/combatTraits/display';
import type { CombatTraitConfig } from '../../combat/combatTraits/types';
import { attachDomTooltip } from './GameTooltipController';

export const attachCombatTraitTooltip = (
    scene: Phaser.Scene,
    hitArea: Phaser.GameObjects.Rectangle,
    trait: CombatTraitConfig,
): void =>
{
    attachDomTooltip(scene, hitArea, () => resolveCombatTraitTooltip(trait));
};
