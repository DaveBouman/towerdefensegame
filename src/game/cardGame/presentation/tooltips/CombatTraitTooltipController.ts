import { resolveCombatTraitTooltip } from '../../combat/combatTraits/display';
import type { CombatTraitConfig } from '../../combat/combatTraits/types';
import {
    attachDomTooltip,
    destroyGameTooltipController,
    getGameTooltipController,
} from './GameTooltipController';

export class CombatTraitTooltipController
{
    constructor (private readonly boundScene: Phaser.Scene) {}

    show (trait: CombatTraitConfig, clientX: number, clientY: number): void
    {
        getGameTooltipController(this.boundScene).show(
            resolveCombatTraitTooltip(trait),
            clientX,
            clientY,
        );
    }

    hide (): void
    {
        getGameTooltipController(this.boundScene).hide();
    }

    destroy (): void
    {
        destroyGameTooltipController();
    }

    matchesScene (scene: Phaser.Scene): boolean
    {
        return this.boundScene === scene;
    }
}

let activeController: CombatTraitTooltipController | null = null;

export const getCombatTraitTooltipController = (scene: Phaser.Scene): CombatTraitTooltipController =>
{
    if (!activeController || !activeController.matchesScene(scene))
    {
        activeController = new CombatTraitTooltipController(scene);
    }

    return activeController;
};

export const destroyCombatTraitTooltipController = (): void =>
{
    destroyGameTooltipController();
    activeController = null;
};

export const attachCombatTraitTooltip = (
    scene: Phaser.Scene,
    hitArea: Phaser.GameObjects.Rectangle,
    trait: CombatTraitConfig,
): void =>
{
    attachDomTooltip(scene, hitArea, () => resolveCombatTraitTooltip(trait));
};
