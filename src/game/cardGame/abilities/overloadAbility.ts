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
 * Payoff for combo chains: when Surge (or Amp Core) activates, deals damage for
 * every other skill card already in the chain, doubled if a Joker has activated.
 * Resolves on the skill's own step (readable beat) — put Surge after your setup.
 * Only the first overload card in the chain contributes.
 */
export const overloadAbility: ChainAbility = {
    id: 'overload',
    /** Play during the card's activation, not buried in end-of-chain effects. */
    resolveOnStep: true,
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
