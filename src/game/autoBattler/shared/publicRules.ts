import rulesJson from '../config/rules.json';
import type { AutoBattlerRules } from '../types';

/** Subset of rules the client may cache for UI labels. Server remains authoritative. */
export interface PublicRules {
    teamSize: number;
    shopSize: number;
    buyCost: number;
    sellReward: number;
    rerollCost: number;
    winsToVictory: number;
    startingLives: number;
}

const full = rulesJson as AutoBattlerRules;

/** Defaults shipped for first paint before welcome; overwritten by server. */
export const DEFAULT_PUBLIC_RULES: PublicRules = {
    teamSize: full.teamSize,
    shopSize: full.shopSize,
    buyCost: full.buyCost,
    sellReward: full.sellReward,
    rerollCost: full.rerollCost,
    winsToVictory: full.winsToVictory,
    startingLives: full.startingLives,
};

export const toPublicRules = (rules: AutoBattlerRules = full): PublicRules =>
    ({
        teamSize: rules.teamSize,
        shopSize: rules.shopSize,
        buyCost: rules.buyCost,
        sellReward: rules.sellReward,
        rerollCost: rules.rerollCost,
        winsToVictory: rules.winsToVictory,
        startingLives: rules.startingLives,
    });
