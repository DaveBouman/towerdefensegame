import type { CardBehavior } from './types';

/** Enemy trap — disarmed when included in the chain; explodes otherwise. */
export const hazardBehavior: CardBehavior = {
    id: 'hazard',
    contributeToAttack: () => ({
        damage: 0,
        includeInSequence: false,
    }),
    onDisarmed: () => undefined,
};
