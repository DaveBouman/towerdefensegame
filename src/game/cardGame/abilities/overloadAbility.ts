import { GAME_RULES, getCardDefinitionOrThrow } from '../config/cardRegistry';
import type { ActivationStep } from '../domain/types';
import type { ChainAbility, ChainAbilityContext, ChainAbilityDamage } from './types';

const abilityCardCount = (chain: readonly ActivationStep[], excludeIndex: number): number =>
    chain.reduce((count, step, index) =>
    {
        if (index === excludeIndex)
        {
            return count;
        }

        const abilityIds = getCardDefinitionOrThrow(step.definitionId).chainAbilityIds ?? [];

        return abilityIds.length > 0 ? count + 1 : count;
    }, 0);

const hasAbility = (step: ActivationStep, abilityId: string): boolean =>
    (getCardDefinitionOrThrow(step.definitionId).chainAbilityIds ?? []).includes(abilityId);

/**
 * Payoff for combo chains: deals damage for every other skill card (fire, poison,
 * rupture, bulwark, …) in the chain, doubled when a Joker activates in the chain.
 * Resolves once per chain (only the first Surge contributes).
 */
export const overloadAbility: ChainAbility = {
    id: 'overload',
    resolve ({ chain, stepIndex }: ChainAbilityContext): ChainAbilityDamage | null
    {
        if (chain.findIndex((step) => hasAbility(step, 'overload')) !== stepIndex)
        {
            return null;
        }

        const skillCards = abilityCardCount(chain, stepIndex);

        if (skillCards <= 0)
        {
            return null;
        }

        const jokerBonus = chain.some((step) => step.behaviorId === 'joker') ? 2 : 1;
        const perCard = GAME_RULES.chainAbilities.overload.damagePerAbilityCard;

        return {
            enemyDamage: skillCards * perCard * jokerBonus,
            playerDamage: 0,
            armorGain: 0,
            poisonStacks: 0,
        };
    },
};
