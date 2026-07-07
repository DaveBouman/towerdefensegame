import { GAME_RULES } from '../config/cardRegistry';
import type { ChainAbility, ChainAbilityDamage } from './types';
import { getDefendIndicesReplacedByPoison } from './poisonReplacement';

/**
 * Converts subsequent defend steps into poison stacks until an attack breaks the
 * streak. Stacks sit on the enemy and deal damage at the start of each of its
 * turns, decaying by 1 per turn (see `CardGameSession.tickPoison`).
 */
export const poisonTrailAbility: ChainAbility = {
    id: 'poison-trail',
    resolve ({ chain, stepIndex, definition }): ChainAbilityDamage | null
    {
        const replacedDefends = getDefendIndicesReplacedByPoison(chain, stepIndex);

        if (replacedDefends.length === 0)
        {
            return null;
        }

        const perCard = definition.power || GAME_RULES.chainAbilities.poisonTrail.damagePerSubsequentCard;

        return {
            enemyDamage: 0,
            playerDamage: 0,
            armorGain: 0,
            poisonStacks: replacedDefends.length * perCard,
        };
    },
};
