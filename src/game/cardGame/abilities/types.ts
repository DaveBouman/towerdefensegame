import type { CardDefinition } from '../config/cardRegistry';
import type { BoardModel } from '../domain/BoardModel';
import type { ActivationStep, SlotPosition } from '../domain/types';

/** Full chain context for resolving a card ability at a specific step. */
export interface ChainAbilityContext {
    board: BoardModel;
    chain: readonly ActivationStep[];
    stepIndex: number;
    step: ActivationStep;
    definition: CardDefinition;
}

export interface ChainAbilityDamage {
    enemyDamage: number;
    playerDamage: number;
    armorGain: number;
}

/** One resolved ability trigger — add new abilities via the registry. */
export interface ChainAbilityEffect extends ChainAbilityDamage {
    abilityId: string;
    stepIndex: number;
    slot: SlotPosition;
    visualId: string;
}

export interface ResolvedChainAbilities extends ChainAbilityDamage {
    effects: ChainAbilityEffect[];
}

export interface ChainAbility {
    id: string;
    resolve (ctx: ChainAbilityContext): ChainAbilityDamage | null;
}
