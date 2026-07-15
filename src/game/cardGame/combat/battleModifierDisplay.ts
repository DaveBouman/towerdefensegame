import type { BattleModifier, BattleModifierStat } from './battleModifiers';
import { BATTLE_MODIFIER_LABELS, describeBattleModifier, formatBattleModifierDelta } from './battleModifiers';
import { getActiveBattleModifierVisual } from '../presentation/enemyIntentVisuals';

export interface BattleModifierDisplayEntry {
    stat: BattleModifierStat;
    delta: number;
    textureKey: string;
    tint: number;
    textColor: string;
    tooltipTitle: string;
    tooltipLines: string[];
}

/** Whether the net delta is good for the player. */
export const isPlayerBeneficialModifier = (stat: BattleModifierStat, delta: number): boolean =>
{
    switch (stat)
    {
        case 'enemy-attack':
            return delta < 0;
        case 'player-damage-taken':
            return delta < 0;
        case 'player-armor':
        case 'player-damage-dealt':
            return delta > 0;
    }
};

export const summarizeBattleModifiers = (
    modifiers: readonly BattleModifier[],
): BattleModifierDisplayEntry[] =>
{
    const totals = new Map<BattleModifierStat, number>();

    for (const modifier of modifiers)
    {
        totals.set(modifier.stat, (totals.get(modifier.stat) ?? 0) + modifier.delta);
    }

    const entries: BattleModifierDisplayEntry[] = [];

    for (const [ stat, delta ] of totals)
    {
        if (Math.abs(delta) < 0.0001)
        {
            continue;
        }

        const visual = getActiveBattleModifierVisual(stat);

        entries.push({
            stat,
            delta,
            textureKey: visual.textureKey,
            tint: visual.tint,
            textColor: visual.textColor,
            tooltipTitle: 'Battle modifier',
            tooltipLines: [
                `${describeBattleModifier(stat, delta)} until your energy refills.`,
                BATTLE_MODIFIER_LABELS[stat],
                'Stacks with other modifiers and cards in the chain.',
            ],
        });
    }

    return entries.sort((a, b) => a.stat.localeCompare(b.stat));
};

export const formatModifierBadgeLabel = (delta: number): string => formatBattleModifierDelta(delta);
