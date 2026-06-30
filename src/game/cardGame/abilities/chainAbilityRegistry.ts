import { getCardDefinitionOrThrow } from '../config/cardRegistry';
import type { BoardModel } from '../domain/BoardModel';
import type { ActivationStep } from '../domain/types';
import { getBoostMultiplierForStep, scaleBoostedValue } from '../combat/chainBoost';
import { fireAlternationAbility } from './fireAlternationAbility';
import { poisonTrailAbility } from './poisonTrailAbility';
import type {
    ChainAbility,
    ChainAbilityContext,
    ChainAbilityDamage,
    ChainAbilityEffect,
    ResolvedChainAbilities,
} from './types';

const abilities = new Map<string, ChainAbility>([
    [ poisonTrailAbility.id, poisonTrailAbility ],
    [ fireAlternationAbility.id, fireAlternationAbility ],
]);

export const registerChainAbility = (ability: ChainAbility): void =>
{
    abilities.set(ability.id, ability);
};

export const getChainAbility = (id: string): ChainAbility | undefined =>
    abilities.get(id);

export const getChainAbilityOrThrow = (id: string): ChainAbility =>
{
    const ability = getChainAbility(id);

    if (!ability)
    {
        throw new Error(`Unknown chain ability: ${id}`);
    }

    return ability;
};

const emptyDamage = (): ChainAbilityDamage => ({
    enemyDamage: 0,
    playerDamage: 0,
    armorGain: 0,
});

const mergeDamage = (total: ChainAbilityDamage, next: ChainAbilityDamage): ChainAbilityDamage => ({
    enemyDamage: total.enemyDamage + next.enemyDamage,
    playerDamage: total.playerDamage + next.playerDamage,
    armorGain: total.armorGain + next.armorGain,
});

/** Resolves registered chain abilities for every step in the activation chain. */
export const resolveChainAbilities = (
    chain: readonly ActivationStep[],
    board: BoardModel,
): ResolvedChainAbilities =>
{
    const effects: ChainAbilityEffect[] = [];
    let totals = emptyDamage();

    chain.forEach((step, stepIndex) =>
    {
        const definition = getCardDefinitionOrThrow(step.definitionId);
        const abilityIds = definition.chainAbilityIds ?? [];

        if (abilityIds.length === 0)
        {
            return;
        }

        const ctx: ChainAbilityContext = {
            board,
            chain,
            stepIndex,
            step,
            definition,
        };

        for (const abilityId of abilityIds)
        {
            const result = getChainAbilityOrThrow(abilityId).resolve(ctx);

            if (!result || (result.enemyDamage === 0 && result.playerDamage === 0 && result.armorGain === 0))
            {
                continue;
            }

            const multiplier = getBoostMultiplierForStep(chain, stepIndex);
            const scaledResult = {
                enemyDamage: scaleBoostedValue(result.enemyDamage, multiplier),
                playerDamage: scaleBoostedValue(result.playerDamage, multiplier),
                armorGain: scaleBoostedValue(result.armorGain, multiplier),
            };

            effects.push({
                abilityId,
                stepIndex,
                slot: step.slot,
                visualId: step.visualId,
                ...scaledResult,
            });
            totals = mergeDamage(totals, scaledResult);
        }
    });

    return {
        effects,
        ...totals,
    };
};

export const getChainAbilitySlots = (effects: readonly ChainAbilityEffect[]): import('../domain/types').SlotPosition[] =>
    effects.map((effect) => ({ ...effect.slot }));
