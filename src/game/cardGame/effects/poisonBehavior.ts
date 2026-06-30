import type { CardBehavior } from './types';

export const poisonBehavior: CardBehavior = {
    id: 'poison',
    contributeToAttack: () => ({
        damage: 0,
        includeInSequence: false,
    }),
};
