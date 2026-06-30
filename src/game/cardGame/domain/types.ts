import type { CardDirection } from './cardDirections';
import type { ChainAbilityEffect } from '../abilities/types';

export interface SlotPosition {
    row: number;
    col: number;
}

/** Who placed the card on the board. Field cards are ambient modifiers (boosts). */
export type CardOwner = 'player' | 'enemy' | 'field';

/** Runtime card on the board or in hand. */
export interface CardInstance {
    instanceId: string;
    definitionId: string;
    /** Continue arrow — where the chain goes after looping back through earlier cards. */
    arrow: import('./cardDirections').CardDirection;
    /** Loop arrow — where the chain jumps to replay earlier cards (loop-reset only). */
    loopArrow?: import('./cardDirections').CardDirection;
    owner?: CardOwner;
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

export type EnemyTurnKind = 'attack' | 'shield' | 'place-hazard';

export interface EnemyTurnStep {
    kind: EnemyTurnKind;
    amount?: number;
}

export interface EnemyTurnAction {
    enemyId: string;
    steps: EnemyTurnStep[];
}

export interface DisarmResult {
    playerDamage?: number;
    enemyDamage?: number;
    armorGain?: number;
    message?: string;
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
    /** Direction the chain follows when leaving this step. */
    exitArrow: CardDirection;
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

export interface RerollState {
    rerollsRemaining: number;
    maxRerollsPerFight: number;
    canReroll: boolean;
    rerollModeActive: boolean;
    selectedCount: number;
}

export interface AttackSequence {
    chain: ActivationStep[];
    steps: AttackStep[];
    totalDamage: number;
    offChainDamage: number;
    offChainArmor: number;
    hazardDamage: number;
    chainAbilityEffects: ChainAbilityEffect[];
    abilityEnemyDamage: number;
    abilityPlayerDamage: number;
    abilityArmorGain: number;
    disarmResults: DisarmResult[];
    stackMultipliers: Partial<Record<string, number>>;
    stepMs: number;
    durationMs: number;
}
