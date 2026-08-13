import type { CardBehavior } from './types';

/** Enemy leech node — disarmed in-chain; heals the enemy if left unchained. */
export const siphonBehavior: CardBehavior = {
    id: 'siphon',
    contributeToAttack: () => ({
        damage: 0,
        includeInSequence: false,
    }),
    onDisarmed: () => undefined,
};
