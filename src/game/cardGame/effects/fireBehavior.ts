import type { CardBehavior } from './types';

export const fireBehavior: CardBehavior = {
    id: 'fire',
    contributeToAttack: ({ definition }) => ({
        damage: definition.power,
        includeInSequence: true,
    }),
};
