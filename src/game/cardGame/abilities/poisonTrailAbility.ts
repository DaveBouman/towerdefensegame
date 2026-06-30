import { GAME_RULES } from '../config/cardRegistry';
import type { ChainAbility, ChainAbilityDamage } from './types';
import { getDefendIndicesReplacedByPoison } from './poisonReplacement';

/** Converts subsequent defend steps into poison damage until an attack breaks the streak. */
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
            enemyDamage: replacedDefends.length * perCard,
            playerDamage: 0,
            armorGain: 0,
        };
    },
};
