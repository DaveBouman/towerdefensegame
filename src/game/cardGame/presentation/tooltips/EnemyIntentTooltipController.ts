import type { EnemyTurnStep } from '../../domain/types';
import { resolveEnemyIntentTooltip } from './enemyIntentTooltipRegistry';
import { attachDomTooltip } from './GameTooltipController';

export const attachEnemyIntentTooltip = (
    scene: Phaser.Scene,
    hitArea: Phaser.GameObjects.Rectangle,
    step: EnemyTurnStep,
    phase: 'upcoming' | 'executing',
): void =>
{
    attachDomTooltip(scene, hitArea, () => resolveEnemyIntentTooltip(step, phase));
};
