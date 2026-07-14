import { GAME_RULES } from '../cardGame/config/cardRegistry';
import { BODY_MOD_IDS } from './bodyMods';

const CHROME_HEART_BONUS = 10;
const CRED_SIPHON_BONUS = 8;

export const getRunMaxHealth = (bodyMods: readonly string[]): number =>
    GAME_RULES.player.maxHealth + (bodyMods.includes(BODY_MOD_IDS.chromeHeart) ? CHROME_HEART_BONUS : 0);

export const getVictoryGoldBonus = (bodyMods: readonly string[]): number =>
    bodyMods.includes(BODY_MOD_IDS.credSiphon) ? CRED_SIPHON_BONUS : 0;
