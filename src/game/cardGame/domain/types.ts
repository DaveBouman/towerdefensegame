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
    /** After Reroute resolves, the chosen direction is shown instead of `?`. */
    jokerDirectionChosen?: boolean;
    owner?: CardOwner;
    /** Set when a single-use card is played — destroyed for this battle, not sent to the graveyard. */
    exhausted?: boolean;
}

export type BoardCell = CardInstance | null;

export type BoardGrid = BoardCell[][];

export interface EnemyState {
    health: number;
    maxHealth: number;
    shield: number;
    /** Active rad stacks — damage the enemy at the start of each of its turns. */
    poison?: number;
}

/** One enemy in a multi-enemy fight. */
export interface EnemyCombatant {
    instanceId: string;
    definitionId: string;
    definition: import('../config/enemyCatalog').LoadedCardGameEnemyDefinition;
    state: EnemyState;
    queuedTurn: EnemyTurnAction | null;
    turnsTaken: number;
    enrageStacks: number;
    /** Lieutenant phase shift triggered at HP threshold. */
    phaseShiftActive?: boolean;
    /** Remaining fully blocked hits from the hitWard passive. */
    hitsBlockedRemaining?: number;
    /** One-turn attack spike when a linked ally dies. */
    linkRageAttackBonus?: number;
    /** Extra traps queued from reroll tax or link rage. */
    pendingExtraTraps?: number;
    /** Attack bonus on next turn from reroll tax. */
    rerollTaxAttackBonus?: number;
    /** Card definition id held by a card thief (returned if killed before fleeing). */
    stolenCardId?: string;
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
    /** Player thorns reflecting this hit back at the attacker. */
    reflectedThorns?: DamageResult;
}

export type EnemyTurnKind =
    | 'attack'
    | 'shield'
    | 'place-hazard'
    | 'place-siphon'
    | 'dampen-field'
    | 'lock-column'
    | 'nullify-lane'
    | 'redirect-hand'
    | 'battle-mod'
    | 'heal-ally'
    | 'shield-ally';

export interface EnemyTurnStep {
    kind: EnemyTurnKind;
    amount?: number;
    modifierStat?: import('../combat/battleModifiers').BattleModifierStat;
    modifierDelta?: number;
    /** Ally support target (multi-enemy fights). */
    targetInstanceId?: string;
    /** Board column index for `lock-column` / `nullify-lane` (0-based). */
    column?: number;
    /** Board row index for `nullify-lane` (0-based). */
    row?: number;
    /** Axis for `nullify-lane`. */
    axis?: 'column' | 'row';
    /** Phantom intent decoy — telegraphed but not executed. */
    decoy?: boolean;
}

export interface EnemyTurnAction {
    /** Combat instance this turn belongs to (multi-enemy fights). */
    instanceId?: string;
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
    targetInstanceId?: string;
    enemyKilled?: boolean;
    /** Combatants spawned by shatter-on-death (new instance ids). */
    spawnedInstanceIds?: string[];
    healOnKill?: number;
    thornsDamage?: number;
    thornsShieldAbsorbed?: number;
    thornsHealthDamage?: number;
    damageBlocked?: boolean;
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
    /** Player thorns granted this step (reflect on enemy attacks this energy round). */
    thorns?: number;
}

export type AttackRejectReason =
    | 'attack-in-progress'
    | 'enemy-turn'
    | 'enemy-defeated'
    | 'player-defeated'
    | 'no-cards-on-board'
    | 'no-energy'
    | 'no-target';

export interface AttackReadiness {
    canAttack: boolean;
    reason: AttackRejectReason | null;
}

export interface TurnState {
    energy: number;
    maxEnergy: number;
    canEndTurn: boolean;
}

export interface HandPenaltyResult {
    totalDamage: number;
    penalizedCards: readonly { definitionId: string; damage: number }[];
}

export interface RerollState {
    rerollsRemaining: number;
    maxRerollsPerFloor: number;
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
    /** Enemy heal from unchained leech nodes (0 if the fight is already over). */
    siphonHeal: number;
    chainAbilityEffects: ChainAbilityEffect[];
    abilityEnemyDamage: number;
    abilityPlayerDamage: number;
    abilityArmorGain: number;
    /** Rad stacks to apply to the enemy after the chain resolves. */
    abilityPoisonStacks: number;
    disarmResults: DisarmResult[];
    stackMultipliers: Partial<Record<string, number>>;
    stepMs: number;
    durationMs: number;
}
