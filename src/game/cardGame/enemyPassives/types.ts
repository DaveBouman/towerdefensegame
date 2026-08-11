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
    | 'dampenTiles'
    | 'curseHand'
    | 'pressureColumn'
    | 'spawnMinion'
    | 'shatterOnDeath'
    | 'credLeech'
    | 'rerollTax'
    | 'cardThief'
    | 'skillJam'
    | 'linkRage'
    | 'bodyguard'
    | 'stutterClock'
    | 'phantomIntent'
    | 'phaseShift'
    | 'handRedirect';

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

export interface CurseHandPassiveConfig {
    id: 'curseHand';
    /** Card definition id added to the player's hand after each enemy turn. */
    cardId: string;
    /** How many copies to add (clamped by hand size). */
    count: number;
}

/** Locks an entire board column so the player cannot place or move onto it. */
export interface PressureColumnPassiveConfig {
    id: 'pressureColumn';
    /**
     * When true, never locks the chain-start column (col 0) so attacks remain possible.
     */
    avoidStartColumn: boolean;
}

/** Spawns a minion after this enemy's turn on a cadence (and optionally at low HP). */
export interface SpawnMinionPassiveConfig {
    id: 'spawnMinion';
    /** Enemy definition id for the spawned minion. */
    minionId: string;
    /** Spawn when this combatant's turnsTaken is a multiple of this (after the turn). */
    everyTurns: number;
    /** Cap on living minions of `minionId` while this host is alive. */
    maxLivingMinions: number;
    /** Also spawn when host HP / max HP drops to this ratio (if under the minion cap). */
    healthRatio?: number;
}

/** On death, remove this combatant and spawn these part enemies. */
export interface ShatterOnDeathPassiveConfig {
    id: 'shatterOnDeath';
    /** Definition ids spawned when this enemy is killed (order = squad order). */
    parts: string[];
}

/** Steals run creds after each of this enemy's turns. */
export interface CredLeechPassiveConfig {
    id: 'credLeech';
    amountPerTurn: number;
}

/** Punishes hand rerolls with extra attack and/or traps on the next turn. */
export interface RerollTaxPassiveConfig {
    id: 'rerollTax';
    attackBonus: number;
    extraTraps: number;
}

/** Steals a deck card, then flees after N turns (card lost only if it escapes). */
export interface CardThiefPassiveConfig {
    id: 'cardThief';
    fleeAfterTurns: number;
}

/** Negates chain abilities from the first N skill cards in each attack. */
export interface SkillJamPassiveConfig {
    id: 'skillJam';
    suppressedSkillCards: number;
}

/** When another enemy dies, this one gains a one-turn attack/trap spike. */
export interface LinkRagePassiveConfig {
    id: 'linkRage';
    attackBonus: number;
    extraTraps: number;
}

/** Redirects the first hit each player attack that targets a protected ally. */
export interface BodyguardPassiveConfig {
    id: 'bodyguard';
    protectDefinitionId: string;
}

/** Acts twice on every Nth enemy phase (telegraphed). */
export interface StutterClockPassiveConfig {
    id: 'stutterClock';
    everyGlobalTurns: number;
}

/** Shows a decoy attack/shield in intent — only the real step executes. */
export interface PhantomIntentPassiveConfig {
    id: 'phantomIntent';
}

export interface PhaseShiftPassiveConfig {
    id: 'phaseShift';
    /** Trigger when health / max health drops to or below this ratio. */
    healthRatio: number;
    label: string;
    message: string;
    attackBonus: number;
    extraTraps: number;
}

/** Scrambles hand-card arrows for the rest of the current energy round. */
export interface HandRedirectPassiveConfig {
    id: 'handRedirect';
    /** Cast on turns where (turnsTaken % everyTurns === 0). */
    everyTurns: number;
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
    | DampenTilesPassiveConfig
    | CurseHandPassiveConfig
    | PressureColumnPassiveConfig
    | SpawnMinionPassiveConfig
    | ShatterOnDeathPassiveConfig
    | CredLeechPassiveConfig
    | RerollTaxPassiveConfig
    | CardThiefPassiveConfig
    | SkillJamPassiveConfig
    | LinkRagePassiveConfig
    | BodyguardPassiveConfig
    | StutterClockPassiveConfig
    | PhantomIntentPassiveConfig
    | PhaseShiftPassiveConfig
    | HandRedirectPassiveConfig;

export type EnemyPassiveInput = EnemyPassiveId | EnemyPassiveConfig;
