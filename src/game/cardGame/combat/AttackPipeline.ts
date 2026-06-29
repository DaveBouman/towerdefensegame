import { GAME_RULES, getCardDefinitionOrThrow, type CardDefinition } from '../config/cardRegistry';
import type { BoardModel } from '../domain/BoardModel';
import { getInBoundsDirections, getNextSlot, slotKey } from '../domain/cardDirections';
import type {
    ActivationStep,
    AttackSequence,
    AttackStep,
    CardDirection,
    SlotPosition,
} from '../domain/types';
import { getCardBehaviorOrThrow } from '../effects/cardBehaviorRegistry';

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

export const buildAttackSequence = (chain: ActivationStep[], stepMs = GAME_RULES.activationStepMs): AttackSequence =>
{
    const steps = chain.filter((step) => step.damage > 0).map(toAttackStep);
    const totalDamage = steps.reduce((sum, step) => sum + step.damage, 0);

    return {
        chain,
        steps,
        totalDamage,
        stepMs,
        durationMs: chain.length * stepMs,
    };
};

export const planAttack = (
    board: BoardModel,
    startSlot: SlotPosition = GAME_RULES.activationStart,
): AttackSequence =>
    buildAttackSequence(planActivationChain(board, startSlot));

export const getJokerDirectionChoices = (
    slot: SlotPosition,
    rows: number,
    cols: number,
): CardDirection[] => getInBoundsDirections(slot, rows, cols);
