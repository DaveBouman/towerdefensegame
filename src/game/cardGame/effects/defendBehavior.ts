import type { CardBehavior } from './types';

export const defendBehavior: CardBehavior = {
    id: 'defend',
    contributeToAttack: () => ({
        damage: 0,
        includeInSequence: false,
    }),
    contributeArmor: ({ definition }) => definition.power,
};
