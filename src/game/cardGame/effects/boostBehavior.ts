import type { CardBehavior } from './types';

/** Field boost — the next card in the chain receives a damage/armor multiplier. */
export const boostBehavior: CardBehavior = {
    id: 'boost',
    contributeToAttack: () => ({
        damage: 0,
        includeInSequence: false,
    }),
};
