import { GAME_RULES, getCardDefinitionOrThrow, getChainStepDistance, type CardDefinition } from '../config/cardRegistry';
import type { BoardModel } from '../domain/BoardModel';
import { cornerTargetDirections, getNextSlot, getSlotAtStepDistance, getSlotAtStepDistanceWithWrap, slotKey } from '../domain/cardDirections';
import type {
    ActivationStep,
    CardDirection,
    SlotPosition,
} from '../domain/types';
import { getCardBehaviorOrThrow } from '../effects/cardBehaviorRegistry';

export const isJokerDefinition = (definition: CardDefinition): boolean =>
    definition.behaviorId === 'joker';

export const isLoopResetDefinition = (definition: CardDefinition): boolean =>
    definition.behaviorId === 'loop-reset';

export const isCornerDefinition = (definition: CardDefinition): boolean =>
    definition.cornerTurn === true;

export const isWrapDefinition = (definition: CardDefinition): boolean =>
    definition.wrapEdges === true;

const getLoopContinueArrow = (card: import('../domain/types').CardInstance): CardDirection =>
    card.arrow;

const getLoopReplayArrow = (card: import('../domain/types').CardInstance): CardDirection =>
    card.loopArrow ?? card.arrow;

const findChainStart = (board: BoardModel, preferred: SlotPosition): SlotPosition | null =>
    board.getCardAt(preferred) ? preferred : null;

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

export interface ChainWalkState {
    activationCounts: Map<string, number>;
    loopResetConsumed: boolean;
    /** Slot keys in activation order — used to reopen only pre-loop cards. */
    activationOrder: string[];
}

export const createChainWalkState = (): ChainWalkState => ({
    activationCounts: new Map(),
    loopResetConsumed: false,
    activationOrder: [],
});

/** Clears visit limits for every card that activated before the loop step. */
export const resetActivationsBeforeLoop = (state: ChainWalkState, loopKey: string): void =>
{
    const loopIndex = state.activationOrder.lastIndexOf(loopKey);

    if (loopIndex <= 0)
    {
        return;
    }

    for (const key of state.activationOrder.slice(0, loopIndex))
    {
        state.activationCounts.delete(key);
    }
};

export const tryBuildActivationStep = (
    board: BoardModel,
    slot: SlotPosition,
    state: ChainWalkState,
): ActivationStep | null =>
{
    const card = board.getCardAt(slot);

    if (!card)
    {
        return null;
    }

    const definition = getCardDefinitionOrThrow(card.definitionId);
    const isLoop = isLoopResetDefinition(definition);
    const isLoopPassThrough = isLoop && state.loopResetConsumed;
    const key = slotKey(slot);
    const maxActivations = definition.maxChainActivations ?? 1;
    const activations = state.activationCounts.get(key) ?? 0;

    if (!isLoopPassThrough && activations >= maxActivations)
    {
        return null;
    }

    if (!isLoopPassThrough)
    {
        state.activationCounts.set(key, activations + 1);
        state.activationOrder.push(key);
    }

    const ctx = buildStepContext(board, slot, card);
    const behavior = getCardBehaviorOrThrow(ctx.definition.behaviorId);
    const attack = isLoopPassThrough
        ? { includeInSequence: false, damage: 0 }
        : behavior.contributeToAttack(ctx);
    const armor = isLoopPassThrough ? 0 : behavior.contributeArmor?.(ctx) ?? 0;
    const thorns = isLoopPassThrough ? 0 : behavior.contributeThorns?.(ctx) ?? 0;

    if (isLoop && !isLoopPassThrough)
    {
        state.loopResetConsumed = true;
        resetActivationsBeforeLoop(state, key);
    }

    const exitArrow = isLoop
        ? isLoopPassThrough
            ? getLoopContinueArrow(card)
            : getLoopReplayArrow(card)
        : card.arrow;

    return {
        slot,
        card,
        definitionId: ctx.definition.id,
        behaviorId: ctx.definition.behaviorId,
        visualId: ctx.definition.visualId,
        arrow: card.arrow,
        exitArrow,
        damage: attack.includeInSequence ? attack.damage : 0,
        armor,
        thorns,
    };
};

export const getNextChainSlot = (
    board: BoardModel,
    from: SlotPosition,
    direction: CardDirection,
    stepDistance = 1,
    wrapEdges = false,
): SlotPosition | null =>
{
    const landing = wrapEdges
        ? getSlotAtStepDistanceWithWrap(from, direction, board.rows, board.cols, stepDistance)
        : getSlotAtStepDistance(from, direction, board.rows, board.cols, stepDistance);

    if (!landing || !board.getCardAt(landing))
    {
        return null;
    }

    return landing;
};

/**
 * Corner move: hooks 90° off the arrow to a forward-diagonal tile. Tries each
 * side in a fixed order and takes the first that holds a card, so a corner card
 * continues around whichever corner has a target.
 */
export const getCornerNextSlot = (
    board: BoardModel,
    from: SlotPosition,
    direction: CardDirection,
): SlotPosition | null =>
{
    for (const diagonal of cornerTargetDirections(direction))
    {
        const landing = getNextSlot(from, diagonal, board.rows, board.cols);

        if (landing && board.getCardAt(landing))
        {
            return landing;
        }
    }

    return null;
};

/** Walk the board following each card's arrow to build the activation chain. */
export const planActivationChain = (
    board: BoardModel,
    startSlot: SlotPosition = GAME_RULES.activationStart,
): ActivationStep[] =>
{
    const chain: ActivationStep[] = [];
    const walkState = createChainWalkState();
    let current: SlotPosition | null = findChainStart(board, startSlot);

    while (current && chain.length < GAME_RULES.maxChainSteps)
    {
        const step = tryBuildActivationStep(board, current, walkState);

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

        current = isCornerDefinition(definition)
            ? getCornerNextSlot(board, current, step.exitArrow)
            : getNextChainSlot(
                board,
                current,
                step.exitArrow,
                getChainStepDistance(definition),
                isWrapDefinition(definition),
            );
    }

    return chain;
};

export const getNextChainSlotFromStep = (
    board: BoardModel,
    step: ActivationStep,
): SlotPosition | null =>
{
    const definition = getCardDefinitionOrThrow(step.definitionId);

    return isCornerDefinition(definition)
        ? getCornerNextSlot(board, step.slot, step.exitArrow)
        : getNextChainSlot(
            board,
            step.slot,
            step.exitArrow,
            getChainStepDistance(definition),
            isWrapDefinition(definition),
        );
};
