import type { BattleModifier, BattleModifierStat } from './battleModifiers';
import { BATTLE_MODIFIER_LABELS, describeBattleModifier, formatBattleModifierDelta } from './battleModifiers';
import { ENEMY_INTENT_TEXTURE_KEY } from '../../../ui/icons/enemyIntentIcons';

export interface BattleModifierDisplayEntry {
    stat: BattleModifierStat;
    delta: number;
    textureKey: string;
    tint: number;
    tooltipTitle: string;
    tooltipLines: string[];
}

const STAT_TEXTURE: Record<BattleModifierStat, string> = {
    'enemy-attack': ENEMY_INTENT_TEXTURE_KEY.attack,
    'player-damage-taken': ENEMY_INTENT_TEXTURE_KEY.shield,
    'player-armor': ENEMY_INTENT_TEXTURE_KEY.shield,
    'player-damage-dealt': ENEMY_INTENT_TEXTURE_KEY.attack,
};

const BUFF_TINT = 0x7af0c8;
const DEBUFF_TINT = 0xff6b8a;

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

        const beneficial = isPlayerBeneficialModifier(stat, delta);

        entries.push({
            stat,
            delta,
            textureKey: STAT_TEXTURE[stat],
            tint: beneficial ? BUFF_TINT : DEBUFF_TINT,
            tooltipTitle: beneficial ? 'Buff' : 'Debuff',
            tooltipLines: [
                describeBattleModifier(stat, delta),
                BATTLE_MODIFIER_LABELS[stat],
                'Lasts until your energy refills at the end of the round.',
            ],
        });
    }

    return entries.sort((a, b) => a.stat.localeCompare(b.stat));
};

export const formatModifierBadgeLabel = (delta: number): string => formatBattleModifierDelta(delta);
