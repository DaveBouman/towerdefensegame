export type AbilityId =
    | 'none'
    | 'buffBehindStart'
    | 'faintSummonSpark'
    | 'splashBeforeAttack'
    | 'snipeFrontStart'
    | 'faintAoe'
    | 'faintHurtAttacker'
    | 'hurtReflect'
    | 'buffAdjacentStart'
    | 'knockOutHeal'
    | 'lonelyPower'
    | 'knockOutPushBack';

export interface UnitDefinition {
    id: string;
    label: string;
    tier: number;
    attack: number;
    health: number;
    abilityId: AbilityId;
    tooltip: string;
}

export interface UnitInstance {
    uid: string;
    definitionId: string;
    attack: number;
    health: number;
    maxHealth: number;
}

export type TeamSlot = UnitInstance | null;

export type Team = TeamSlot[];

export interface ShopOffer {
    uid: string;
    definitionId: string;
    frozen: boolean;
}

export interface PlayerShopState {
    gold: number;
    tier: number;
    turn: number;
    lives: number;
    wins: number;
    team: Team;
    offers: ShopOffer[];
}

export type BattleSide = 'a' | 'b';

export type BattleEvent =
    | { type: 'start'; seed: string }
    | { type: 'startOfBattle'; side: BattleSide; uid: string; definitionId: string }
    | { type: 'attack'; attackerSide: BattleSide; attackerUid: string; defenderUid: string; damage: number }
    | { type: 'damage'; side: BattleSide; uid: string; amount: number; healthAfter: number }
    | { type: 'heal'; side: BattleSide; uid: string; amount: number; healthAfter: number }
    | { type: 'buff'; side: BattleSide; uid: string; attackDelta: number; healthDelta: number }
    | { type: 'summon'; side: BattleSide; uid: string; definitionId: string; slot: number; attack: number; health: number }
    | { type: 'faint'; side: BattleSide; uid: string; definitionId: string }
    | { type: 'move'; side: BattleSide; uid: string; from: number; to: number }
    | { type: 'end'; winner: BattleSide | 'draw' };

export interface BattleResult {
    winner: BattleSide | 'draw';
    log: BattleEvent[];
    survivingA: number;
    survivingB: number;
}

export interface AutoBattlerRules {
    teamSize: number;
    shopSize: number;
    startingGold: number;
    goldPerTurn: number;
    buyCost: number;
    sellReward: number;
    rerollCost: number;
    startingLives: number;
    winsToVictory: number;
    maxTier: number;
    tierByTurn: number[];
    livesLostBase: number;
    livesLostPerSurvivor: number;
    livesLostCap: number;
}

export type RunPhase = 'menu' | 'shop' | 'waiting' | 'battle' | 'victory' | 'defeat';

export interface LockedBattle {
    seed: string;
    playerTeam: Team;
    enemyTeam: Team;
    result: BattleResult;
}
