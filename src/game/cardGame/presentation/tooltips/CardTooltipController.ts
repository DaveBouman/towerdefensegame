import type { CardInstance } from '../../domain/types';
import { resolveCardTooltip } from './cardTooltipRegistry';
import { attachDomTooltip } from './GameTooltipController';

export const attachCardTooltip = (
    scene: Phaser.Scene,
    hitArea: Phaser.GameObjects.Rectangle,
    card: CardInstance,
): void =>
{
    attachDomTooltip(scene, hitArea, () => resolveCardTooltip(card));
};
