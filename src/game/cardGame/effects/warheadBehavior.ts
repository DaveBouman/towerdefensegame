import type { CardBehavior } from './types';

/**
 * Blast — base hit plus Charge bonus for each contiguous Charge before it.
 */
export const warheadBehavior: CardBehavior = {
    id: 'warhead',
    contributeToAttack: ({ definition }) => ({
        damage: definition.power,
        includeInSequence: true,
    }),
};
