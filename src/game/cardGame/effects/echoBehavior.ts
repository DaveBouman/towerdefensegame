import type { CardBehavior } from './types';

/** Re-triggers the previous chain step when activated — see CardGamePresenter replay logic. */
export const echoBehavior: CardBehavior = {
    id: 'echo',
    contributeToAttack: () => ({
        damage: 0,
        includeInSequence: false,
    }),
};
