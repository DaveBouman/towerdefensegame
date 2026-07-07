export type EnemyPassiveId =
    | 'thorns'
    | 'enrage'
    | 'lastStand'
    | 'smoke'
    | 'wetBlanket'
    | 'silenceTile'
    | 'loopHunter'
    | 'jammer'
    | 'escalate'
    | 'dampenTiles';

export interface ThornsPassiveConfig {
    id: 'thorns';
    reflectDamage: number;
}

export interface EnragePassiveConfig {
    id: 'enrage';
    /** Extra attack damage on the next enemy turn per undisarmed trap this round. */
    attackBonusPerTrap: number;
    /** Extra traps placed on the next enemy turn per undisarmed trap this round. */
    extraTrapsPerTrap: number;
}

export interface LastStandPassiveConfig {
    id: 'lastStand';
    /** Trigger while enemy health / max health is at or below this ratio. */
    healthRatio: number;
    attackDamage: number;
    shieldGain: number;
    hazardsPerTurn: number;
    /** When active, always attacks instead of shielding. */
    forceAttack: boolean;
}

export interface SmokePassiveConfig {
    id: 'smoke';
    /** Number of poison cards per attack whose trail is negated (first N poisons). */
    suppressedPoisonCards: number;
}

export interface WetBlanketPassiveConfig {
    id: 'wetBlanket';
    /** Multiplier on fire alternation bonus while the enemy has shield. */
    fireAlternationMultiplier: number;
}

export interface SilenceTilePassiveConfig {
    id: 'silenceTile';
    tilesPerTurn: number;
}

export interface LoopHunterPassiveConfig {
    id: 'loopHunter';
    damage: number;
}

export interface JammerPassiveConfig {
    id: 'jammer';
    minChainLength: number;
    shieldGain: number;
}

export interface EscalatePassiveConfig {
    id: 'escalate';
    /** Extra traps added to each enemy turn per ramp (one ramp per turn taken). */
    trapsPerRamp: number;
    /** Hard cap on the total number of traps placed in a single enemy turn. */
    maxTraps: number;
}

export interface DampenTilesPassiveConfig {
    id: 'dampenTiles';
    /**
     * Which checkerboard tiles are dampened. `even` = tiles where (row + col) is
     * even (includes the top-left activation start), `odd` = the other set.
     */
    parity: 'even' | 'odd';
    /** Multiplier applied to a card's damage / armor while it sits on a dampened tile (e.g. 0.5 = half). */
    multiplier: number;
    /** The enemy casts the Dead Zone event on turns where (turnsTaken % everyTurns === 0). */
    everyTurns: number;
    /** How many player turns the Dead Zone field stays active once cast. */
    duration: number;
}

export type EnemyPassiveConfig =
    | ThornsPassiveConfig
    | EnragePassiveConfig
    | LastStandPassiveConfig
    | SmokePassiveConfig
    | WetBlanketPassiveConfig
    | SilenceTilePassiveConfig
    | LoopHunterPassiveConfig
    | JammerPassiveConfig
    | EscalatePassiveConfig
    | DampenTilesPassiveConfig;

export type EnemyPassiveInput = EnemyPassiveId | EnemyPassiveConfig;
