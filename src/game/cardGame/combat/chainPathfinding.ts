import { GAME_RULES, getCardDefinitionOrThrow, getChainStepDistance, type CardDefinition } from '../config/cardRegistry';
import type { BoardModel } from '../domain/BoardModel';
import {
    cornerFirstStep,
    getInBoundsDirectionsAtDistance,
    getNextSlot,
    getSlotAtStepDistance,
    getSlotAtStepDistanceWithWrap,
    slotKey,
} from '../domain/cardDirections';
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

/** Leap that activates the skipped tile for effects, then continues on its own arrow. */
export const isPierceLeapDefinition = (definition: CardDefinition): boolean =>
    definition.pierceLeap === true && getChainStepDistance(definition) > 1;

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
    const isSpentPassThrough = card.spent === true;
    const skipEffects = isLoopPassThrough || isSpentPassThrough;
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
    const attack = skipEffects
        ? { includeInSequence: false, damage: 0 }
        : behavior.contributeToAttack(ctx);
    const armor = skipEffects ? 0 : behavior.contributeArmor?.(ctx) ?? 0;
    const thorns = skipEffects ? 0 : behavior.contributeThorns?.(ctx) ?? 0;

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
 * Corner move: diagonal arrow's horizontal leg first (e.g. down-left → left).
 * The card entered there keeps its own arrow, which continues the bend.
 */
export const getCornerNextSlot = (
    board: BoardModel,
    from: SlotPosition,
    direction: CardDirection,
): SlotPosition | null =>
{
    const landing = getNextSlot(from, cornerFirstStep(direction), board.rows, board.cols);

    if (!landing || !board.getCardAt(landing))
    {
        return null;
    }

    return landing;
};

/** Mid tile a pierce-leap activates before landing two steps away. */
export const getPierceLeapMidSlot = (
    board: BoardModel,
    from: SlotPosition,
    direction: CardDirection,
): SlotPosition | null =>
{
    const mid = getSlotAtStepDistance(from, direction, board.rows, board.cols, 1);

    if (!mid || !board.getCardAt(mid))
    {
        return null;
    }

    return mid;
};

const advanceFromStep = (
    board: BoardModel,
    step: ActivationStep,
): { next: SlotPosition | null; forcedExit: CardDirection | null } =>
{
    const definition = getCardDefinitionOrThrow(step.definitionId);

    if (isCornerDefinition(definition))
    {
        return {
            next: getCornerNextSlot(board, step.slot, step.exitArrow),
            forcedExit: null,
        };
    }

    if (isPierceLeapDefinition(definition))
    {
        const mid = getPierceLeapMidSlot(board, step.slot, step.exitArrow);

        if (mid)
        {
            return { next: mid, forcedExit: step.exitArrow };
        }

        return {
            next: getNextChainSlot(
                board,
                step.slot,
                step.exitArrow,
                getChainStepDistance(definition),
                isWrapDefinition(definition),
            ),
            forcedExit: null,
        };
    }

    return {
        next: getNextChainSlot(
            board,
            step.slot,
            step.exitArrow,
            getChainStepDistance(definition),
            isWrapDefinition(definition),
        ),
        forcedExit: null,
    };
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
    let forcedExit: CardDirection | null = null;

    while (current && chain.length < GAME_RULES.maxChainSteps)
    {
        const built = tryBuildActivationStep(board, current, walkState);

        if (!built)
        {
            break;
        }

        const step: ActivationStep = forcedExit
            ? { ...built, exitArrow: forcedExit }
            : built;

        forcedExit = null;
        chain.push(step);

        const definition = getCardDefinitionOrThrow(step.definitionId);

        if (isJokerDefinition(definition))
        {
            break;
        }

        const advance = advanceFromStep(board, step);

        current = advance.next;
        forcedExit = advance.forcedExit;
    }

    return chain;
};

export interface ChainPathPreview
{
    slots: SlotPosition[];
    /** Index of the first Reroute whose exit is guessed for preview (null = fully known). */
    tentativeFromIndex: number | null;
}

const tentativeJokerExit = (
    board: BoardModel,
    slot: SlotPosition,
): CardDirection | null =>
{
    const stepDistance = getChainStepDistance(getCardDefinitionOrThrow('joker'));
    const inBounds = getInBoundsDirectionsAtDistance(slot, board.rows, board.cols, stepDistance);
    const withCard = inBounds.filter((direction) =>
        getNextChainSlot(board, slot, direction, stepDistance) !== null,
    );
    const choices = withCard.length > 0 ? withCard : inBounds;

    return choices[0] ?? null;
};

/**
 * Idle path glow: same walk as combat planning, but continues past unset Reroute
 * using the first valid exit so the line does not die at the `?` card.
 */
export const planChainPathPreview = (
    board: BoardModel,
    startSlot: SlotPosition = GAME_RULES.activationStart,
): ChainPathPreview =>
{
    const slots: SlotPosition[] = [];
    const walkState = createChainWalkState();
    let current: SlotPosition | null = findChainStart(board, startSlot);
    let forcedExit: CardDirection | null = null;
    let tentativeFromIndex: number | null = null;

    while (current && slots.length < GAME_RULES.maxChainSteps)
    {
        const built = tryBuildActivationStep(board, current, walkState);

        if (!built)
        {
            break;
        }

        const step: ActivationStep = forcedExit
            ? { ...built, exitArrow: forcedExit }
            : built;

        forcedExit = null;
        slots.push({ ...step.slot });

        const definition = getCardDefinitionOrThrow(step.definitionId);

        if (isJokerDefinition(definition))
        {
            if (!step.card.jokerDirectionChosen)
            {
                if (tentativeFromIndex === null)
                {
                    tentativeFromIndex = slots.length - 1;
                }

                const guess = tentativeJokerExit(board, step.slot);

                if (!guess)
                {
                    break;
                }

                current = getNextChainSlot(
                    board,
                    step.slot,
                    guess,
                    getChainStepDistance(definition),
                );
                continue;
            }

            const advance = advanceFromStep(board, step);

            current = advance.next;
            forcedExit = advance.forcedExit;
            continue;
        }

        const advance = advanceFromStep(board, step);

        current = advance.next;
        forcedExit = advance.forcedExit;
    }

    return { slots, tentativeFromIndex };
};

export const getNextChainSlotFromStep = (
    board: BoardModel,
    step: ActivationStep,
): SlotPosition | null =>
{
    const definition = getCardDefinitionOrThrow(step.definitionId);

    if (isCornerDefinition(definition))
    {
        return getCornerNextSlot(board, step.slot, step.exitArrow);
    }

    if (isPierceLeapDefinition(definition))
    {
        return getPierceLeapMidSlot(board, step.slot, step.exitArrow)
            ?? getNextChainSlot(
                board,
                step.slot,
                step.exitArrow,
                getChainStepDistance(definition),
                isWrapDefinition(definition),
            );
    }

    return getNextChainSlot(
        board,
        step.slot,
        step.exitArrow,
        getChainStepDistance(definition),
        isWrapDefinition(definition),
    );
};
