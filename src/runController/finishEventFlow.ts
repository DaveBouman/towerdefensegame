import type { AppliedEventResult } from '../game/run/runEvents';
import {
    findNewDefinitionIdsNeedingDirection,
    type RunDeckCard,
} from '../game/run/runDeck';

export interface FinishEventPlan {
    playerHealth: number;
    gold: number;
    deck: RunDeckCard[];
    bodyMods: string[];
    unlockCardIds: string[];
    unlockBodyModIds: string[];
    /** When non-empty, open the direction picker before returning to the map. */
    needingDirection: string[];
}

/** Pure plan for applying an event result onto the current run deck. */
export const planFinishEvent = (
    currentDeck: readonly RunDeckCard[],
    result: AppliedEventResult,
): FinishEventPlan => ({
    playerHealth: result.playerHealth,
    gold: result.gold,
    deck: result.deck,
    bodyMods: result.bodyMods,
    unlockCardIds: result.deck.map((card) => card.definitionId),
    unlockBodyModIds: result.bodyMods,
    needingDirection: findNewDefinitionIdsNeedingDirection(currentDeck, result.deck),
});
