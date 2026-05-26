/** +1 attack damage per this much kill gold absorbed. */
export const GOLD_PER_BONUS_ATTACK = 10;

/** +1 max health per this much kill gold absorbed. */
export const GOLD_PER_BONUS_HEALTH = 8;

export const goldToBonusAttack = (killGold: number): number =>
    Math.floor(killGold / GOLD_PER_BONUS_ATTACK);

export const goldToBonusMaxHealth = (killGold: number): number =>
    Math.floor(killGold / GOLD_PER_BONUS_HEALTH);
