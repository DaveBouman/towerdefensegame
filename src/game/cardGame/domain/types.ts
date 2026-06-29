import type { CardDirection } from './cardDirections';

export interface SlotPosition {
    row: number;
    col: number;
}

/** Runtime card on the board or in hand. */
export interface CardInstance {
    instanceId: string;
    definitionId: string;
    arrow: import('./cardDirections').CardDirection;
}

export type BoardCell = CardInstance | null;

export type BoardGrid = BoardCell[][];

export interface EnemyState {
    health: number;
    maxHealth: number;
    shield: number;
}

export interface PlayerState {
    health: number;
    maxHealth: number;
    shield: number;
}

export interface PlayerDamageResult {
    player: PlayerState;
    shieldAbsorbed: number;
    healthDamage: number;
}

export type EnemyTurnKind = 'attack' | 'shield';

export interface EnemyTurnAction {
    kind: EnemyTurnKind;
    amount: number;
}

export interface DamageResult {
    enemy: EnemyState;
    shieldAbsorbed: number;
    healthDamage: number;
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

export type AttackRejectReason =
    | 'attack-in-progress'
    | 'enemy-turn'
    | 'enemy-defeated'
    | 'player-defeated'
    | 'no-cards-on-board';

export interface AttackReadiness {
    canAttack: boolean;
    reason: AttackRejectReason | null;
}

export interface AttackSequence {
    chain: ActivationStep[];
    steps: AttackStep[];
    totalDamage: number;
    offChainDamage: number;
    offChainArmor: number;
    stepMs: number;
    durationMs: number;
}
