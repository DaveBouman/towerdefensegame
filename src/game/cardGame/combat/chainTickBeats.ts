import { GAME_RULES, getCardDefinition, getCardDurationTicks } from '../config/cardRegistry';
import type { BoardModel } from '../domain/BoardModel';
import type { SlotPosition } from '../domain/types';

/** Running tick clock along a planned chain — used to mark where the enemy hits. */
export interface ChainTickBeat
{
    slot: SlotPosition;
    /** Sum of card durations from chain start through this step. */
    cumulativeTicks: number;
    /** True on steps that cross a multiple of the enemy hit timer (or last card if short). */
    isHitBeat: boolean;
}

/**
 * After cards are placed, walk the planned path and stamp each step with the
 * shared tick clock. When `hitAtTicks` is set, every step that crosses a multiple
 * of that timer is a hit beat (30, 60, …). If the whole chain is shorter than the
 * timer, the last card is still marked — the strike lands there at end of chain.
 */
export const buildChainTickBeats = (
    board: BoardModel,
    slots: readonly SlotPosition[],
    hitAtTicks: number | null,
): ChainTickBeat[] =>
{
    let sum = 0;
    let anyHitMarked = false;
    const defaultTicks = GAME_RULES.defaultCardDuration ?? 10;

    const beats = slots.map((slot) =>
    {
        const card = board.getCardAt(slot);
        const definition = card ? getCardDefinition(card.definitionId) : null;
        const ticks = definition ? getCardDurationTicks(definition) : defaultTicks;
        const before = sum;

        sum += ticks;

        const isHitBeat = hitAtTicks !== null
            && hitAtTicks > 0
            && Math.floor(sum / hitAtTicks) > Math.floor(before / hitAtTicks);

        if (isHitBeat)
        {
            anyHitMarked = true;
        }

        return {
            slot: { ...slot },
            cumulativeTicks: sum,
            isHitBeat,
        };
    });

    if (
        hitAtTicks !== null
        && hitAtTicks > 0
        && beats.length > 0
        && !anyHitMarked
    )
    {
        // Chain ends before the enemy timer — strike still lands on the last step.
        beats[beats.length - 1] = {
            ...beats[beats.length - 1]!,
            isHitBeat: true,
        };
    }

    return beats;
};
