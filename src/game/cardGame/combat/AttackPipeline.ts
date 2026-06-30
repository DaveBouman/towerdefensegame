import { GAME_RULES, getCardDefinitionOrThrow, type CardDefinition } from '../config/cardRegistry';
import type { BoardModel } from '../domain/BoardModel';
import { isEnemyOwnedCard, isPlayerOwnedCard } from '../domain/cardOwnership';
import { getInBoundsDirections, getNextSlot, slotKey } from '../domain/cardDirections';
import type {
    ActivationStep,
    AttackSequence,
    AttackStep,
    CardDirection,
    DisarmResult,
    SlotPosition,
} from '../domain/types';
import { getCardBehaviorOrThrow } from '../effects/cardBehaviorRegistry';

const STACKABLE_BEHAVIORS = new Set([ 'attack', 'defend' ]);

const buildStepContext = (
    board: BoardModel,
    slot: SlotPosition,
    card: import('../domain/types').CardInstance,
) =>
{
    const definition = getCardDefinitionOrThrow(card.definitionId);

    return {
        board,
        slot,
        card,
        definition,
    };
};

export const isJokerDefinition = (definition: CardDefinition): boolean =>
    definition.behaviorId === 'joker';

export const isHazardDefinition = (definition: CardDefinition): boolean =>
    definition.behaviorId === 'hazard';

const findChainStart = (board: BoardModel, preferred: SlotPosition): SlotPosition | null =>
    board.getCardAt(preferred) ? preferred : null;

export const tryBuildActivationStep = (
    board: BoardModel,
    slot: SlotPosition,
    activationCounts: Map<string, number>,
): ActivationStep | null =>
{
    const card = board.getCardAt(slot);

    if (!card)
    {
        return null;
    }

    const definition = getCardDefinitionOrThrow(card.definitionId);
    const key = slotKey(slot);
    const maxActivations = definition.maxChainActivations ?? 1;
    const activations = activationCounts.get(key) ?? 0;

    if (activations >= maxActivations)
    {
        return null;
    }

    activationCounts.set(key, activations + 1);

    const ctx = buildStepContext(board, slot, card);
    const behavior = getCardBehaviorOrThrow(ctx.definition.behaviorId);
    const attack = behavior.contributeToAttack(ctx);
    const armor = behavior.contributeArmor?.(ctx) ?? 0;

    return {
        slot,
        card,
        definitionId: ctx.definition.id,
        behaviorId: ctx.definition.behaviorId,
        visualId: ctx.definition.visualId,
        arrow: card.arrow,
        damage: attack.includeInSequence ? attack.damage : 0,
        armor,
    };
};

export const getNextChainSlot = (
    board: BoardModel,
    from: SlotPosition,
    direction: CardDirection,
): SlotPosition | null =>
{
    const next = getNextSlot(from, direction, board.rows, board.cols);

    if (!next || !board.getCardAt(next))
    {
        return null;
    }

    return next;
};

/** Walk the board following each card's arrow to build the activation chain. */
export const planActivationChain = (
    board: BoardModel,
    startSlot: SlotPosition = GAME_RULES.activationStart,
): ActivationStep[] =>
{
    const chain: ActivationStep[] = [];
    const activationCounts = new Map<string, number>();
    let current: SlotPosition | null = findChainStart(board, startSlot);

    while (current)
    {
        const step = tryBuildActivationStep(board, current, activationCounts);

        if (!step)
        {
            break;
        }

        chain.push(step);

        const definition = getCardDefinitionOrThrow(step.definitionId);

        if (isJokerDefinition(definition))
        {
            break;
        }

        current = getNextChainSlot(board, current, step.arrow);
    }

    return chain;
};

const toAttackStep = (step: ActivationStep): AttackStep => ({
    slot: step.slot,
    card: step.card,
    definitionId: step.definitionId,
    damage: step.damage,
    behaviorId: step.behaviorId,
    visualId: step.visualId,
});

/** Multiplier per behavior based on how many times it appears in the chain. */
export const computeChainTypeMultipliers = (
    chain: readonly ActivationStep[],
): Partial<Record<string, number>> =>
{
    const counts = new Map<string, number>();

    for (const step of chain)
    {
        if (!STACKABLE_BEHAVIORS.has(step.behaviorId))
        {
            continue;
        }

        counts.set(step.behaviorId, (counts.get(step.behaviorId) ?? 0) + 1);
    }

    const multipliers: Partial<Record<string, number>> = {};
    const { perDuplicate } = GAME_RULES.typeStackBonus;

    for (const [ behaviorId, count ] of counts)
    {
        if (count > 1)
        {
            multipliers[behaviorId] = 1 + (count - 1) * perDuplicate;
        }
    }

    return multipliers;
};

const applyChainStacking = (
    chain: ActivationStep[],
    multipliers: Partial<Record<string, number>>,
): ActivationStep[] =>
    chain.map((step) =>
    {
        const multiplier = multipliers[step.behaviorId];

        if (!multiplier)
        {
            return step;
        }

        if (step.behaviorId === 'attack' && step.damage > 0)
        {
            return {
                ...step,
                damage: Math.round(step.damage * multiplier),
            };
        }

        if (step.behaviorId === 'defend' && step.armor > 0)
        {
            return {
                ...step,
                armor: Math.round(step.armor * multiplier),
            };
        }

        return step;
    });

export const collectDisarmResults = (
    board: BoardModel,
    chain: readonly ActivationStep[],
): DisarmResult[] =>
{
    const results: DisarmResult[] = [];

    for (const step of chain)
    {
        if (!isHazardDefinition(getCardDefinitionOrThrow(step.definitionId)))
        {
            continue;
        }

        const ctx = buildStepContext(board, step.slot, step.card);
        const behavior = getCardBehaviorOrThrow(ctx.definition.behaviorId);
        const result = behavior.onDisarmed?.(ctx);

        if (result)
        {
            results.push(result);
        }
    }

    return results;
};

export const buildAttackSequence = (
    chain: ActivationStep[],
    board?: BoardModel,
    stepMs = GAME_RULES.activationStepMs,
): AttackSequence =>
{
    const stackMultipliers = computeChainTypeMultipliers(chain);
    const scaledChain = applyChainStacking(chain, stackMultipliers);
    const steps = scaledChain.filter((step) => step.damage > 0).map(toAttackStep);
    const totalDamage = steps.reduce((sum, step) => sum + step.damage, 0);
    const offChain = board ? computeOffChainBonuses(board, scaledChain) : { damage: 0, armor: 0 };
    const hazardDamage = board ? computeHazardDamage(board, scaledChain) : 0;
    const disarmResults = board ? collectDisarmResults(board, scaledChain) : [];

    return {
        chain: scaledChain,
        steps,
        totalDamage,
        offChainDamage: offChain.damage,
        offChainArmor: offChain.armor,
        hazardDamage,
        disarmResults,
        stackMultipliers,
        stepMs,
        durationMs: scaledChain.length * stepMs,
    };
};

/** Cards on the board that never activated in the chain still chip in a small bonus. */
export const computeOffChainBonuses = (
    board: BoardModel,
    chain: readonly ActivationStep[],
): { damage: number; armor: number } =>
{
    const activated = new Set(chain.map((step) => slotKey(step.slot)));
    let damage = 0;
    let armor = 0;

    for (const slot of board.slotsInOrder())
    {
        if (activated.has(slotKey(slot)))
        {
            continue;
        }

        const card = board.getCardAt(slot);

        if (!card || isEnemyOwnedCard(card))
        {
            continue;
        }

        const definition = getCardDefinitionOrThrow(card.definitionId);

        if (definition.behaviorId === 'attack')
        {
            damage += GAME_RULES.offChainBonus.attackDamage;
        }
        else if (definition.behaviorId === 'defend')
        {
            armor += GAME_RULES.offChainBonus.defendArmor;
        }
    }

    return { damage, armor };
};

/** Enemy traps that were not disarmed in the chain explode for their power. */
export const computeHazardDamage = (
    board: BoardModel,
    chain: readonly ActivationStep[],
): number =>
{
    const activated = new Set(chain.map((step) => slotKey(step.slot)));
    let damage = 0;

    for (const slot of board.slotsInOrder())
    {
        if (activated.has(slotKey(slot)))
        {
            continue;
        }

        const card = board.getCardAt(slot);

        if (!card || !isEnemyOwnedCard(card))
        {
            continue;
        }

        const definition = getCardDefinitionOrThrow(card.definitionId);

        if (isHazardDefinition(definition))
        {
            damage += definition.power;
        }
    }

    return damage;
};

export const getOffChainSlots = (
    board: BoardModel,
    chain: readonly ActivationStep[],
): SlotPosition[] =>
{
    const activated = new Set(chain.map((step) => slotKey(step.slot)));
    const slots: SlotPosition[] = [];

    for (const slot of board.slotsInOrder())
    {
        const card = board.getCardAt(slot);

        if (!activated.has(slotKey(slot)) && card && isPlayerOwnedCard(card))
        {
            slots.push({ ...slot });
        }
    }

    return slots;
};

export const getUnchainedHazardSlots = (
    board: BoardModel,
    chain: readonly ActivationStep[],
): SlotPosition[] =>
{
    const activated = new Set(chain.map((step) => slotKey(step.slot)));
    const slots: SlotPosition[] = [];

    for (const slot of board.slotsInOrder())
    {
        if (activated.has(slotKey(slot)))
        {
            continue;
        }

        const card = board.getCardAt(slot);

        if (!card || !isEnemyOwnedCard(card))
        {
            continue;
        }

        const definition = getCardDefinitionOrThrow(card.definitionId);

        if (isHazardDefinition(definition))
        {
            slots.push({ ...slot });
        }
    }

    return slots;
};

export const planAttack = (
    board: BoardModel,
    startSlot: SlotPosition = GAME_RULES.activationStart,
): AttackSequence =>
    buildAttackSequence(planActivationChain(board, startSlot), board);

export const getJokerDirectionChoices = (
    slot: SlotPosition,
    rows: number,
    cols: number,
): CardDirection[] => getInBoundsDirections(slot, rows, cols);
