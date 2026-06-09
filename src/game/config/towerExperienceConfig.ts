/** Damage dealt by a tower converts to experience at this rate (1 = 1:1). */
export const DAMAGE_TO_EXPERIENCE_RATE = 1;

export const damageDealtToExperience = (damageDealt: number): number =>
    Math.floor(damageDealt * DAMAGE_TO_EXPERIENCE_RATE);
