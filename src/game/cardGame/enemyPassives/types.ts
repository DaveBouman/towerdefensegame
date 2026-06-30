export type EnemyPassiveId =
    | 'thorns'
    | 'enrage'
    | 'lastStand'
    | 'smoke'
    | 'wetBlanket'
    | 'silenceTile'
    | 'loopHunter'
    | 'jammer';

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

export type EnemyPassiveConfig =
    | ThornsPassiveConfig
    | EnragePassiveConfig
    | LastStandPassiveConfig
    | SmokePassiveConfig
    | WetBlanketPassiveConfig
    | SilenceTilePassiveConfig
    | LoopHunterPassiveConfig
    | JammerPassiveConfig;

export type EnemyPassiveInput = EnemyPassiveId | EnemyPassiveConfig;
