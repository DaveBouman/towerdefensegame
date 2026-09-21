import type { CardBehavior } from './types';

/**
 * Charge — inert alone. Place immediately before Blast for +damage each
 * (see `cordite-payload` chain ability).
 */
export const corditeBehavior: CardBehavior = {
    id: 'cordite',
    contributeToAttack: () => ({
        damage: 0,
        includeInSequence: false,
    }),
};
