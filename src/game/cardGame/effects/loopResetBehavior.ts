import type { CardBehavior } from './types';

/** Clears per-slot activation limits so the chain can revisit earlier cards. */
export const loopResetBehavior: CardBehavior = {
    id: 'loop-reset',
    contributeToAttack: () => ({
        damage: 0,
        includeInSequence: false,
    }),
};
