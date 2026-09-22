import { GAME_RULES, getCardDefinition, getCardDurationTicks } from '../config/cardRegistry';
import type { BoardModel } from '../domain/BoardModel';
import type { SlotPosition } from '../domain/types';

/** Running tick clock along a planned chain — used to mark where the enemy hits. */
export interface ChainTickBeat
{
    slot: SlotPosition;
    /** Sum of card durations from chain start through this step. */
    cumulativeTicks: number;
    /** True on the first step where the sum reaches the enemy hit tick. */
    isHitBeat: boolean;
}

/**
 * After cards are placed, walk the planned path and stamp each step with the
 * shared tick clock. When `hitAtTicks` is set (engaged station), the first step
 * that meets or exceeds that value is the enemy hit beat.
 */
export const buildChainTickBeats = (
    board: BoardModel,
    slots: readonly SlotPosition[],
    hitAtTicks: number | null,
): ChainTickBeat[] =>
{
    let sum = 0;
    let hitMarked = false;
    const defaultTicks = GAME_RULES.defaultCardDuration ?? 10;

    return slots.map((slot) =>
    {
        const card = board.getCardAt(slot);
        const definition = card ? getCardDefinition(card.definitionId) : null;
        const ticks = definition ? getCardDurationTicks(definition) : defaultTicks;

        sum += ticks;

        const isHitBeat = !hitMarked
            && hitAtTicks !== null
            && hitAtTicks > 0
            && sum >= hitAtTicks;

        if (isHitBeat)
        {
            hitMarked = true;
        }

        return {
            slot: { ...slot },
            cumulativeTicks: sum,
            isHitBeat,
        };
    });
};
