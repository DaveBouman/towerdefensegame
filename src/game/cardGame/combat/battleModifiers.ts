import { GAME_RULES } from '../config/cardRegistry';

/** Which combat value a ±% modifier adjusts. */
export type BattleModifierStat =
    | 'enemy-attack'
    | 'player-damage-taken'
    | 'player-armor'
    | 'player-damage-dealt';

/** How long an applied modifier stays active. */
export type BattleModifierDuration = 'enemy-turn' | 'energy-round';

export interface BattleModifier {
    stat: BattleModifierStat;
    /** Fractional delta — e.g. 0.1 = +10%, -0.1 = -10%. */
    delta: number;
    source: 'player' | 'enemy';
    duration?: BattleModifierDuration;
}

export interface BattleModifierTotals {
    enemyAttack: number;
    playerDamageTaken: number;
    playerArmor: number;
    playerDamageDealt: number;
}

export const BATTLE_MODIFIER_STEP = GAME_RULES.battleModifier?.step ?? 0.1;

export const aggregateBattleModifiers = (
    modifiers: readonly BattleModifier[],
): BattleModifierTotals =>
{
    const totals: BattleModifierTotals = {
        enemyAttack: 0,
        playerDamageTaken: 0,
        playerArmor: 0,
        playerDamageDealt: 0,
    };

    for (const modifier of modifiers)
    {
        switch (modifier.stat)
        {
            case 'enemy-attack':
                totals.enemyAttack += modifier.delta;
                break;
            case 'player-damage-taken':
                totals.playerDamageTaken += modifier.delta;
                break;
            case 'player-armor':
                totals.playerArmor += modifier.delta;
                break;
            case 'player-damage-dealt':
                totals.playerDamageDealt += modifier.delta;
                break;
        }
    }

    return totals;
};

/** Applies stacked percentage modifiers to a base value (floored, never negative). */
export const applyBattleModifier = (base: number, deltaSum: number): number =>
{
    if (base <= 0 || deltaSum === 0)
    {
        return Math.max(0, base);
    }

    return Math.max(0, Math.floor(base * (1 + deltaSum)));
};

export const formatBattleModifierDelta = (delta: number): string =>
{
    const percent = Math.round(delta * 100);

    return percent > 0 ? `+${percent}%` : `${percent}%`;
};

export const BATTLE_MODIFIER_LABELS: Record<BattleModifierStat, string> = {
    'enemy-attack': 'Enemy attack',
    'player-damage-taken': 'Damage taken',
    'player-armor': 'Shield gained',
    'player-damage-dealt': 'Damage dealt',
};

export const describeBattleModifierDuration = (duration: BattleModifierDuration = 'enemy-turn'): string =>
    duration === 'energy-round'
        ? 'Lasts until your energy refills at the end of the round.'
        : 'Lasts through the enemy response, then expires.';

export const isPersistentBattleModifier = (modifier: BattleModifier): boolean =>
    modifier.duration === 'energy-round';

export const describeBattleModifier = (
    stat: BattleModifierStat,
    delta: number,
): string =>
{
    const label = BATTLE_MODIFIER_LABELS[stat];
    const percent = formatBattleModifierDelta(delta);

    if (delta > 0)
    {
        return `${label} ${percent}`;
    }

    return `${label} ${percent}`;
};

/** Preset enemy intent modifiers (±10% step). */
export const ENEMY_BATTLE_MODIFIER_PRESETS: readonly Pick<BattleModifier, 'stat' | 'delta'>[] = [
    { stat: 'enemy-attack', delta: BATTLE_MODIFIER_STEP },
    { stat: 'player-damage-taken', delta: BATTLE_MODIFIER_STEP },
    { stat: 'player-armor', delta: -BATTLE_MODIFIER_STEP },
    { stat: 'player-damage-dealt', delta: -BATTLE_MODIFIER_STEP },
];
