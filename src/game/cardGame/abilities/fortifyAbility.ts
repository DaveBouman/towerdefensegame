import { GAME_RULES, getCardDefinitionOrThrow } from '../config/cardRegistry';
import type { ActivationStep } from '../domain/types';
import type { ChainAbility, ChainAbilityContext, ChainAbilityDamage } from './types';

const hasAbility = (step: ActivationStep, abilityId: string): boolean =>
    (getCardDefinitionOrThrow(step.definitionId).chainAbilityIds ?? []).includes(abilityId);

/**
 * Rewards defend-heavy chains: extra armor for every defend past a threshold.
 * Resolves once per chain (only the first Bulwark contributes).
 */
export const fortifyAbility: ChainAbility = {
    id: 'fortify',
    resolve ({ chain, stepIndex }: ChainAbilityContext): ChainAbilityDamage | null
    {
        if (chain.findIndex((step) => hasAbility(step, 'fortify')) !== stepIndex)
        {
            return null;
        }

        const { defendThreshold, armorPerExtraDefend } = GAME_RULES.chainAbilities.fortify;
        const defendCount = chain.filter((step) => step.behaviorId === 'defend').length;
        const extraDefends = Math.max(0, defendCount - defendThreshold);

        if (extraDefends <= 0)
        {
            return null;
        }

        return {
            enemyDamage: 0,
            playerDamage: 0,
            armorGain: extraDefends * armorPerExtraDefend,
            poisonStacks: 0,
        };
    },
};
