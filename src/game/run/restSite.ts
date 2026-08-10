/** Fraction of max integrity restored when resting at the pre-boss safehouse. */
export const REST_HEAL_FRACTION = 0.3;

export const getRestHealAmount = (maxHealth: number): number =>
    Math.max(1, Math.floor(maxHealth * REST_HEAL_FRACTION));
