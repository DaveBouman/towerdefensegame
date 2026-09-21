import { GAME_RULES, getCardDefinitionOrThrow } from '../config/cardRegistry';
import type { ActivationStep, CardInstance } from '../domain/types';
import { isEnemyOwnedCard, isFieldOwnedCard, isPlayerOwnedCard } from '../domain/cardOwnership';

/** Player attack/defend cards that have not been moved since placement this energy round. */
export const isCardAnchored = (card: CardInstance): boolean =>
{
    if (!card.settled || card.relocated || card.spent || card.exhausted)
    {
        return false;
    }

    if (isEnemyOwnedCard(card) || isFieldOwnedCard(card) || !isPlayerOwnedCard(card))
    {
        return false;
    }

    const behaviorId = getCardDefinitionOrThrow(card.definitionId).behaviorId;

    return behaviorId === 'attack' || behaviorId === 'defend' || behaviorId === 'redline';
};

export const markCardSettled = (card: CardInstance): void =>
{
    card.settled = true;
    delete card.relocated;
};

export const markCardRelocated = (card: CardInstance): void =>
{
    card.relocated = true;
};

export const clearCardAnchoredState = (card: CardInstance): void =>
{
    delete card.settled;
    delete card.relocated;
};

/** Flat bonus for leaving a card on its tile — applied on chain activation. */
export const applyAnchoredBonuses = (chain: ActivationStep[]): ActivationStep[] =>
    chain.map((step) =>
    {
        if (!isCardAnchored(step.card))
        {
            return step;
        }

        const definition = getCardDefinitionOrThrow(step.definitionId);
        let damage = step.damage;
        let armor = step.armor;

        if ((definition.behaviorId === 'attack' || definition.behaviorId === 'redline') && damage > 0)
        {
            damage += GAME_RULES.anchoredBonus.attackDamage;
        }

        if ((definition.behaviorId === 'defend' || definition.behaviorId === 'redline') && armor > 0)
        {
            armor += GAME_RULES.anchoredBonus.defendArmor;
        }

        if (damage === step.damage && armor === step.armor)
        {
            return step;
        }

        return {
            ...step,
            damage,
            armor,
        };
    });

/** Extra off-chain chip for unmoved attack/defend cards outside the chain. */
export const anchoredOffChainBonusForCard = (card: CardInstance): { damage: number; armor: number } =>
{
    if (!isCardAnchored(card))
    {
        return { damage: 0, armor: 0 };
    }

    const definition = getCardDefinitionOrThrow(card.definitionId);
    let damage = 0;
    let armor = 0;

    if (definition.behaviorId === 'attack' || definition.behaviorId === 'redline')
    {
        damage = GAME_RULES.anchoredBonus.attackDamage;
    }

    if (definition.behaviorId === 'defend' || definition.behaviorId === 'redline')
    {
        armor = GAME_RULES.anchoredBonus.defendArmor;
    }

    return { damage, armor };
};
