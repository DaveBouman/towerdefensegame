import { getCardDefinitionOrThrow } from '../config/cardRegistry';
import type { BoardModel } from '../domain/BoardModel';
import type { ActivationStep } from '../domain/types';
import { getBoostMultiplierForStep, scaleBoostedValue } from '../combat/chainBoost';
import { bleedAbility } from './bleedAbility';
import { fireAlternationAbility } from './fireAlternationAbility';
import { fortifyAbility } from './fortifyAbility';
import { overloadAbility } from './overloadAbility';
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
    [ bleedAbility.id, bleedAbility ],
    [ fortifyAbility.id, fortifyAbility ],
    [ overloadAbility.id, overloadAbility ],
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
    poisonStacks: 0,
});

const mergeDamage = (total: ChainAbilityDamage, next: ChainAbilityDamage): ChainAbilityDamage => ({
    enemyDamage: total.enemyDamage + next.enemyDamage,
    playerDamage: total.playerDamage + next.playerDamage,
    armorGain: total.armorGain + next.armorGain,
    poisonStacks: total.poisonStacks + next.poisonStacks,
});

const isEmptyResult = (result: ChainAbilityDamage): boolean =>
    result.enemyDamage === 0
    && result.playerDamage === 0
    && result.armorGain === 0
    && result.poisonStacks === 0;

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

            if (!result || isEmptyResult(result))
            {
                continue;
            }

            const multiplier = getBoostMultiplierForStep(chain, stepIndex);
            const scaledResult = {
                enemyDamage: scaleBoostedValue(result.enemyDamage, multiplier),
                playerDamage: scaleBoostedValue(result.playerDamage, multiplier),
                armorGain: scaleBoostedValue(result.armorGain, multiplier),
                poisonStacks: scaleBoostedValue(result.poisonStacks, multiplier),
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
