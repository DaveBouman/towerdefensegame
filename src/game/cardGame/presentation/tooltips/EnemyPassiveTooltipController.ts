import type { EnemyPassiveConfig } from '../../enemyPassives/types';
import { resolveEnemyPassiveTooltip } from './enemyPassiveTooltipRegistry';
import {
    attachDomTooltip,
    destroyGameTooltipController,
    getGameTooltipController,
} from './GameTooltipController';

export class EnemyPassiveTooltipController
{
    constructor (private readonly boundScene: Phaser.Scene) {}

    show (passive: EnemyPassiveConfig, clientX: number, clientY: number): void
    {
        getGameTooltipController(this.boundScene).show(
            resolveEnemyPassiveTooltip(passive),
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

let activeController: EnemyPassiveTooltipController | null = null;

export const getEnemyPassiveTooltipController = (scene: Phaser.Scene): EnemyPassiveTooltipController =>
{
    if (!activeController || !activeController.matchesScene(scene))
    {
        activeController = new EnemyPassiveTooltipController(scene);
    }

    return activeController;
};

export const destroyEnemyPassiveTooltipController = (): void =>
{
    destroyGameTooltipController();
    activeController = null;
};

export const attachEnemyPassiveTooltip = (
    scene: Phaser.Scene,
    hitArea: Phaser.GameObjects.Rectangle,
    passive: EnemyPassiveConfig,
): void =>
{
    attachDomTooltip(scene, hitArea, () => resolveEnemyPassiveTooltip(passive));
};
