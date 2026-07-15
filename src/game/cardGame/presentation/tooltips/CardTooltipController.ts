import type { CardInstance } from '../../domain/types';
import { resolveCardTooltip } from './cardTooltipRegistry';
import {
    attachDomTooltip,
    destroyGameTooltipController,
    getGameTooltipController,
} from './GameTooltipController';

export class CardTooltipController
{
    constructor (private readonly boundScene: Phaser.Scene) {}

    show (card: CardInstance, clientX: number, clientY: number): void
    {
        getGameTooltipController(this.boundScene).show(resolveCardTooltip(card), clientX, clientY);
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

let activeController: CardTooltipController | null = null;

export const getCardTooltipController = (scene: Phaser.Scene): CardTooltipController =>
{
    if (!activeController || !activeController.matchesScene(scene))
    {
        activeController = new CardTooltipController(scene);
    }

    return activeController;
};

export const destroyCardTooltipController = (): void =>
{
    destroyGameTooltipController();
    activeController = null;
};

export const attachCardTooltip = (
    scene: Phaser.Scene,
    hitArea: Phaser.GameObjects.Rectangle,
    card: CardInstance,
): void =>
{
    attachDomTooltip(scene, hitArea, () => resolveCardTooltip(card));
};
