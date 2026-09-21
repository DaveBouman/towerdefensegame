import { GAME_RULES } from '../config/cardRegistry';
import type { ChainAbility, ChainAbilityDamage } from './types';
import { computeCorditePayloadBonus, countCorditeBeforePayload } from './corditePayload';

/**
 * Blast (warhead) detonates Charge cards immediately before it:
 * Charge → Charge → … → Blast = bonus attack per Charge.
 */
export const corditePayloadAbility: ChainAbility = {
    id: 'cordite-payload',
    resolve ({ chain, stepIndex }): ChainAbilityDamage | null
    {
        const corditeCount = countCorditeBeforePayload(chain, stepIndex);
        const damagePerCordite = GAME_RULES.chainAbilities.corditePayload.damagePerCordite;
        const enemyDamage = computeCorditePayloadBonus(corditeCount, damagePerCordite);

        if (enemyDamage <= 0)
        {
            return null;
        }

        return {
            enemyDamage,
            playerDamage: 0,
            armorGain: 0,
            poisonStacks: 0,
        };
    },
};
