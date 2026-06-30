import { GAME_RULES } from '../config/cardRegistry';
import type { ChainAbility, ChainAbilityDamage } from './types';
import { computeFireAlternationBonus, countAlternatingAttackDefendAfter } from './fireAlternation';

/** Bonus damage when attack and defend cards alternate after fire. */
export const fireAlternationAbility: ChainAbility = {
    id: 'fire-alternation',
    resolve ({ chain, stepIndex }): ChainAbilityDamage | null
    {
        const alternatingSteps = countAlternatingAttackDefendAfter(chain, stepIndex);
        const bonusPerStep = GAME_RULES.chainAbilities.fireAlternation.bonusDamagePerAlternatingStep;
        const enemyDamage = computeFireAlternationBonus(alternatingSteps, bonusPerStep);

        if (enemyDamage <= 0)
        {
            return null;
        }

        return {
            enemyDamage,
            playerDamage: 0,
            armorGain: 0,
        };
    },
};
