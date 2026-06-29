import type { CardBehavior } from './types';

export const jokerBehavior: CardBehavior = {
    id: 'joker',
    contributeToAttack: () => ({
        damage: 0,
        includeInSequence: false,
    }),
};
