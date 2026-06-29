import { GAME_RULES, getCardDefinitionOrThrow } from '../config/cardRegistry';
import type { BoardModel } from '../domain/BoardModel';
import { getNextSlot, slotKey } from '../domain/cardDirections';
import type {
    ActivationStep,
    AttackSequence,
    AttackStep,
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

const findChainStart = (board: BoardModel, preferred: SlotPosition): SlotPosition | null =>
    board.getCardAt(preferred) ? preferred : null;

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
        const key = slotKey(current);
        const card = board.getCardAt(current);

        if (!card)
        {
            break;
        }

        const definition = getCardDefinitionOrThrow(card.definitionId);
        const maxActivations = definition.maxChainActivations ?? 1;
        const activations = activationCounts.get(key) ?? 0;

        if (activations >= maxActivations)
        {
            break;
        }

        activationCounts.set(key, activations + 1);

        const ctx = buildStepContext(board, current, card);
        const behavior = getCardBehaviorOrThrow(ctx.definition.behaviorId);
        const attack = behavior.contributeToAttack(ctx);
        const armor = behavior.contributeArmor?.(ctx) ?? 0;

        chain.push({
            slot: current,
            card,
            definitionId: ctx.definition.id,
            behaviorId: ctx.definition.behaviorId,
            visualId: ctx.definition.visualId,
            arrow: card.arrow,
            damage: attack.includeInSequence ? attack.damage : 0,
            armor,
        });

        const next = getNextSlot(current, card.arrow, board.rows, board.cols);

        if (!next || !board.getCardAt(next))
        {
            break;
        }

        current = next;
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

export const planAttack = (
    board: BoardModel,
    startSlot: SlotPosition = GAME_RULES.activationStart,
): AttackSequence =>
{
    const chain = planActivationChain(board, startSlot);
    const steps = chain.filter((step) => step.damage > 0).map(toAttackStep);
    const totalDamage = steps.reduce((sum, step) => sum + step.damage, 0);
    const stepMs = GAME_RULES.activationStepMs;

    return {
        chain,
        steps,
        totalDamage,
        stepMs,
        durationMs: chain.length * stepMs,
    };
};
