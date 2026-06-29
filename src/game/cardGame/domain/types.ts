import type { CardDirection } from './cardDirections';

export interface SlotPosition {
    row: number;
    col: number;
}

/** Runtime card on the board or in hand. */
export interface CardInstance {
    instanceId: string;
    definitionId: string;
}

export type BoardCell = CardInstance | null;

export type BoardGrid = BoardCell[][];

export interface EnemyState {
    health: number;
    maxHealth: number;
}

export interface PlacedCard {
    slot: SlotPosition;
    card: CardInstance;
}

export interface AttackStep {
    slot: SlotPosition;
    card: CardInstance;
    definitionId: string;
    damage: number;
    behaviorId: string;
    visualId: string;
}

/** One step in the arrow chain — attack and/or defend. */
export interface ActivationStep {
    slot: SlotPosition;
    card: CardInstance;
    definitionId: string;
    behaviorId: string;
    visualId: string;
    arrow: CardDirection;
    damage: number;
    armor: number;
}

export interface AttackSequence {
    chain: ActivationStep[];
    steps: AttackStep[];
    totalDamage: number;
    durationMs: number;
}
