import type { CardBehavior } from './types';

export const thornsBehavior: CardBehavior = {
    id: 'thorns',
    contributeToAttack: () => ({
        damage: 0,
        includeInSequence: false,
    }),
    contributeThorns: ({ definition }) => definition.power,
};
