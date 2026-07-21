import type { BattleModifier, BattleModifierStat } from './battleModifiers';
import { BATTLE_MODIFIER_LABELS, describeBattleModifier, formatBattleModifierDelta } from './battleModifiers';
import { getActiveBattleModifierVisual } from '../presentation/enemyIntentVisuals';

export type BattleModifierAnchor = 'player' | 'enemy';

export interface BattleModifierDisplayEntry {
    stat: BattleModifierStat;
    delta: number;
    beneficial: boolean;
    anchor: BattleModifierAnchor;
    textureKey: string;
    tint: number;
    textColor: string;
    tooltipTitle: string;
    tooltipLines: string[];
}

const BENEFICIAL_TEXT = '#00ff9d';
const HARMFUL_TEXT = '#ff8a84';

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

/** Enemy-attack attaches under the enemy; all other stats under the player. */
export const getBattleModifierAnchor = (stat: BattleModifierStat): BattleModifierAnchor =>
    (stat === 'enemy-attack' ? 'enemy' : 'player');

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

        const beneficial = isPlayerBeneficialModifier(stat, delta);
        const visual = getActiveBattleModifierVisual(stat);

        entries.push({
            stat,
            delta,
            beneficial,
            anchor: getBattleModifierAnchor(stat),
            textureKey: visual.textureKey,
            tint: visual.tint,
            textColor: beneficial ? BENEFICIAL_TEXT : HARMFUL_TEXT,
            tooltipTitle: BATTLE_MODIFIER_LABELS[stat],
            tooltipLines: [
                `${describeBattleModifier(stat, delta)} until your energy refills.`,
                beneficial ? 'Buff for you.' : 'Debuff for you.',
                'Stacks with other modifiers and cards in the chain.',
            ],
        });
    }

    return entries.sort((a, b) => a.stat.localeCompare(b.stat));
};

export const formatModifierBadgeLabel = (delta: number): string => formatBattleModifierDelta(delta);
