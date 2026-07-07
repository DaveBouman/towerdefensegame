import { GAME_RULES, getCardDefinitionOrThrow } from '../config/cardRegistry';
import type { ActivationStep } from '../domain/types';
import type { ChainAbility, ChainAbilityContext, ChainAbilityDamage } from './types';

const hasAbility = (step: ActivationStep, abilityId: string): boolean =>
    (getCardDefinitionOrThrow(step.definitionId).chainAbilityIds ?? []).includes(abilityId);

/**
 * Rewards attack-heavy chains: bonus damage for every attack past a threshold.
 * Resolves once per chain (only the first Rupture contributes) so multiple copies
 * do not double-count the same attacks.
 */
export const bleedAbility: ChainAbility = {
    id: 'bleed',
    resolve ({ chain, stepIndex }: ChainAbilityContext): ChainAbilityDamage | null
    {
        if (chain.findIndex((step) => hasAbility(step, 'bleed')) !== stepIndex)
        {
            return null;
        }

        const { attackThreshold, bonusPerExtraAttack } = GAME_RULES.chainAbilities.bleed;
        const attackCount = chain.filter((step) => step.behaviorId === 'attack').length;
        const extraAttacks = Math.max(0, attackCount - attackThreshold);

        if (extraAttacks <= 0)
        {
            return null;
        }

        return {
            enemyDamage: extraAttacks * bonusPerExtraAttack,
            playerDamage: 0,
            armorGain: 0,
            poisonStacks: 0,
        };
    },
};
