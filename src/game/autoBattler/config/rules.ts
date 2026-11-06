import rulesJson from './rules.json';
import type { AutoBattlerRules } from '../types';

export const AUTO_BATTLER_RULES: AutoBattlerRules = rulesJson as AutoBattlerRules;

export const tierForTurn = (turn: number): number =>
{
    const index = Math.max(0, turn - 1);
    const table = AUTO_BATTLER_RULES.tierByTurn;
    const tier = table[Math.min(index, table.length - 1)] ?? AUTO_BATTLER_RULES.maxTier;

    return Math.min(tier, AUTO_BATTLER_RULES.maxTier);
};

export const livesLostOnDefeat = (enemySurvivors: number): number =>
{
    const raw = AUTO_BATTLER_RULES.livesLostBase
        + enemySurvivors * AUTO_BATTLER_RULES.livesLostPerSurvivor;

    return Math.min(AUTO_BATTLER_RULES.livesLostCap, Math.max(1, raw));
};
