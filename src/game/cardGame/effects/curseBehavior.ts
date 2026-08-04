import type { CardBehavior } from './types';

/** Inert on the board — place to clear it from hand; clogs a tile, deals no damage. */
export const curseBehavior: CardBehavior = {
    id: 'curse',
    contributeToAttack: () => ({
        damage: 0,
        includeInSequence: true,
    }),
};
