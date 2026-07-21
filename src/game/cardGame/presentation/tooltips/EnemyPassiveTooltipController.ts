import type { EnemyPassiveConfig } from '../../enemyPassives/types';
import { resolveEnemyPassiveTooltip } from './enemyPassiveTooltipRegistry';
import { attachDomTooltip } from './GameTooltipController';

export const attachEnemyPassiveTooltip = (
    scene: Phaser.Scene,
    hitArea: Phaser.GameObjects.Rectangle,
    passive: EnemyPassiveConfig,
): void =>
{
    attachDomTooltip(scene, hitArea, () => resolveEnemyPassiveTooltip(passive));
};
