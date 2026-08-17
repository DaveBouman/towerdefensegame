import type { CardBehavior } from './types';

/** Burst attack + armor, typically paired with `exhaustOnPlay`. */
export const redlineBehavior: CardBehavior = {
    id: 'redline',
    contributeToAttack: ({ definition }) => ({
        damage: definition.power,
        includeInSequence: true,
    }),
    contributeArmor: ({ definition }) => definition.power,
};
