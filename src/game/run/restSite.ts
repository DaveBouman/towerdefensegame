import { RUN_ECONOMY } from './config/runEconomy';

/** Fraction of max integrity restored when resting at the pre-boss safehouse. */
export const REST_HEAL_FRACTION = RUN_ECONOMY.rest.healFraction;

export const getRestHealAmount = (maxHealth: number): number =>
    Math.max(1, Math.floor(maxHealth * REST_HEAL_FRACTION));
