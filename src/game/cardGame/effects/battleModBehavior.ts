import type { CardBehavior } from './types';

/** Tactical modifier — no direct damage; applies a battle-wide ±% buff when chained. */
export const battleModBehavior: CardBehavior = {
    id: 'battle-mod',
    contributeToAttack: () => ({
        damage: 0,
        includeInSequence: false,
    }),
};
