import type { EnemyTurnStep } from '../../domain/types';
import { resolveEnemyIntentTooltip } from './enemyIntentTooltipRegistry';
import {
    attachDomTooltip,
    destroyGameTooltipController,
    getGameTooltipController,
} from './GameTooltipController';

export class EnemyIntentTooltipController
{
    constructor (private readonly boundScene: Phaser.Scene) {}

    show (
        step: EnemyTurnStep,
        phase: 'upcoming' | 'executing',
        clientX: number,
        clientY: number,
    ): void
    {
        getGameTooltipController(this.boundScene).show(
            resolveEnemyIntentTooltip(step, phase),
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

let activeController: EnemyIntentTooltipController | null = null;

export const getEnemyIntentTooltipController = (scene: Phaser.Scene): EnemyIntentTooltipController =>
{
    if (!activeController || !activeController.matchesScene(scene))
    {
        activeController = new EnemyIntentTooltipController(scene);
    }

    return activeController;
};

export const destroyEnemyIntentTooltipController = (): void =>
{
    destroyGameTooltipController();
    activeController = null;
};

export const attachEnemyIntentTooltip = (
    scene: Phaser.Scene,
    hitArea: Phaser.GameObjects.Rectangle,
    step: EnemyTurnStep,
    phase: 'upcoming' | 'executing',
): void =>
{
    attachDomTooltip(scene, hitArea, () => resolveEnemyIntentTooltip(step, phase));
};
