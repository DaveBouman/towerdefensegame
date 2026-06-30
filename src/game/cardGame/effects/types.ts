import type { CardDefinition } from '../config/cardRegistry';
import type { AttackStep, CardInstance, SlotPosition } from '../domain/types';
import type { DisarmResult } from '../domain/types';
import type { BoardModel } from '../domain/BoardModel';

export interface AttackStepContext {
    board: BoardModel;
    slot: SlotPosition;
    card: CardInstance;
    definition: CardDefinition;
}

export interface AttackContribution {
    damage: number;
    includeInSequence: boolean;
}

/** Logic hook for card behaviors — add new effects by registering implementations. */
export interface CardBehavior {
    id: string;
    contributeToAttack (ctx: AttackStepContext): AttackContribution;
    contributeArmor?: (ctx: AttackStepContext) => number;
    /** Called when this card is activated in the chain (e.g. hazard disarm hooks). */
    onDisarmed?: (ctx: AttackStepContext) => DisarmResult | void;
}

export interface ResolvedAttackStep extends AttackStep {}
