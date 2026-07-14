import type { CardBehavior } from './types';

/** Inert on the board — curse cards are meant to clog the hand, not chain. */
export const curseBehavior: CardBehavior = {
    id: 'curse',
    contributeToAttack: () => ({
        damage: 0,
        includeInSequence: true,
    }),
};
