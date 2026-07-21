import type { BattleModifierStat } from '../combat/battleModifiers';
import { formatBattleModifierDelta } from '../combat/battleModifiers';
import { isPlayerBeneficialModifier } from '../combat/battleModifierDisplay';
import { getActiveBattleModifierVisual } from './enemyIntentVisuals';
import { playIntentLabelFloatingText } from './visualEffects/visualEffectTweens';

export const playBattleModifierFloatingLabel = (
    scene: Phaser.Scene,
    parent: Phaser.GameObjects.Container,
    x: number,
    y: number,
    stat: BattleModifierStat,
    delta: number,
): void =>
{
    const visual = getActiveBattleModifierVisual(stat);
    const beneficial = isPlayerBeneficialModifier(stat, delta);

    playIntentLabelFloatingText(
        scene,
        parent,
        x,
        y,
        formatBattleModifierDelta(delta),
        beneficial ? '#00ff9d' : visual.textColor,
    );
};
