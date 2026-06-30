import { GAME_RULES, getCardDefinitionOrThrow, type CardDefinition } from '../config/cardRegistry';
import type { BoardModel } from '../domain/BoardModel';
import { isEnemyOwnedCard, isFieldOwnedCard, isPlayerOwnedCard } from '../domain/cardOwnership';
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

/** Skills, jokers, hazards, and other non-stackable cards do not break type streaks. */
export const isStreakNeutralBehavior = (behaviorId: string): boolean =>
    !STACKABLE_BEHAVIORS.has(behaviorId);

const streakToMultiplier = (streak: number): number =>
{
    if (streak <= 1)
    {
        return 1;
    }

    return 1 + (streak - 1) * GAME_RULES.typeStackBonus.perDuplicate;
};

/** Consecutive streak length for a stackable step; skills in between do not reset it. */
export const computeStreakAtIndex = (
    chain: readonly ActivationStep[],
    index: number,
): number =>
{
    const step = chain[index];

    if (!step || isStreakNeutralBehavior(step.behaviorId))
    {
        return 0;
    }

    let streakBehavior: string | null = null;
    let streak = 0;

    for (let i = 0; i <= index; i++)
    {
        const current = chain[i]!;

        if (isStreakNeutralBehavior(current.behaviorId))
        {
            continue;
        }

        if (current.behaviorId === streakBehavior)
        {
            streak += 1;
        }
        else
        {
            streakBehavior = current.behaviorId;
            streak = 1;
        }
    }

    return streak;
};

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

export const isBoostDefinition = (definition: CardDefinition): boolean =>
    definition.behaviorId === 'boost';

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

/** Peak streak multiplier per behavior — for HUD / sequence metadata. */
export const computeChainTypeMultipliers = (
    chain: readonly ActivationStep[],
): Partial<Record<string, number>> =>
{
    const peakStreak = new Map<string, number>();

    chain.forEach((step, index) =>
    {
        if (!STACKABLE_BEHAVIORS.has(step.behaviorId))
        {
            return;
        }

        const streak = computeStreakAtIndex(chain, index);
        const currentPeak = peakStreak.get(step.behaviorId) ?? 0;

        if (streak > currentPeak)
        {
            peakStreak.set(step.behaviorId, streak);
        }
    });

    const multipliers: Partial<Record<string, number>> = {};

    for (const [ behaviorId, streak ] of peakStreak)
    {
        const multiplier = streakToMultiplier(streak);

        if (multiplier > 1)
        {
            multipliers[behaviorId] = multiplier;
        }
    }

    return multipliers;
};

const applyChainStacking = (chain: ActivationStep[]): ActivationStep[] =>
    chain.map((step, index) =>
    {
        if (!STACKABLE_BEHAVIORS.has(step.behaviorId))
        {
            return step;
        }

        const multiplier = streakToMultiplier(computeStreakAtIndex(chain, index));

        if (multiplier <= 1)
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

/** Buffs the step immediately after a field boost in the chain. */
export const applyBoostBonuses = (chain: ActivationStep[]): ActivationStep[] =>
{
    const multiplier = GAME_RULES.fieldBoost.nextStepMultiplier;

    return chain.map((step, index) =>
    {
        if (index === 0 || chain[index - 1]?.behaviorId !== 'boost')
        {
            return step;
        }

        let damage = step.damage;
        let armor = step.armor;

        if (damage > 0)
        {
            damage = Math.round(damage * multiplier);
        }

        if (armor > 0)
        {
            armor = Math.round(armor * multiplier);
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
};

export const isBoostedChainStep = (
    chain: readonly ActivationStep[],
    index: number,
): boolean =>
    index > 0 && chain[index - 1]?.behaviorId === 'boost';

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
    const scaledChain = applyBoostBonuses(applyChainStacking(chain));
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

        if (!card || isEnemyOwnedCard(card) || isFieldOwnedCard(card))
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
