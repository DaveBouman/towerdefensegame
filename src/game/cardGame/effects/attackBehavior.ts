import type { CardBehavior } from './types';

export const attackBehavior: CardBehavior = {
    id: 'attack',
    contributeToAttack: ({ definition }) => ({
        damage: definition.power,
        includeInSequence: true,
    }),
};
