import { GAME_RULES } from '../cardGame/config/cardRegistry';

const VITALITY_BONUS = 10;
const LUCKY_POUCH_GOLD = 8;

export const getRunMaxHealth = (trinkets: readonly string[]): number =>
    GAME_RULES.player.maxHealth + (trinkets.includes('vitality-charm') ? VITALITY_BONUS : 0);

export const getVictoryGoldBonus = (trinkets: readonly string[]): number =>
    trinkets.includes('lucky-pouch') ? LUCKY_POUCH_GOLD : 0;
