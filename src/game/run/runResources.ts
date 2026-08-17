import { GAME_RULES } from '../cardGame/config/cardRegistry';
import { BODY_MOD_IDS } from './bodyMods';
import { RUN_ECONOMY } from './config/runEconomy';

export const CHROME_HEART_BONUS = RUN_ECONOMY.bodyMods.chromeHeart.maxHealthBonus;
export const OVERCLOCK_CELL_BONUS = RUN_ECONOMY.bodyMods.overclockCell.energyBonus;
export const CRED_SIPHON_BONUS = RUN_ECONOMY.bodyMods.credSiphon.victoryGold;

export const getRunMaxHealth = (bodyMods: readonly string[]): number =>
    GAME_RULES.player.maxHealth
    + (bodyMods.includes(BODY_MOD_IDS.chromeHeart) ? CHROME_HEART_BONUS : 0)
    + (bodyMods.includes(BODY_MOD_IDS.gatekeeperSeal)
        ? RUN_ECONOMY.bodyMods.gatekeeperSeal.maxHealthBonus
        : 0);

export const getBattleEnergyBonus = (bodyMods: readonly string[]): number =>
    (bodyMods.includes(BODY_MOD_IDS.overclockCell) ? OVERCLOCK_CELL_BONUS : 0)
    + (bodyMods.includes(BODY_MOD_IDS.gatekeeperSeal)
        ? RUN_ECONOMY.bodyMods.gatekeeperSeal.energyBonus
        : 0);

export const getVictoryGoldBonus = (bodyMods: readonly string[]): number =>
    bodyMods.includes(BODY_MOD_IDS.credSiphon) ? CRED_SIPHON_BONUS : 0;
