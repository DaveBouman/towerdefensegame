import type { WorldPosition } from '../grid/types';
import type { DamageType, EnemyStatsSnapshot } from './combat/types';
import type { TowerDefinitionId } from '../config/towerCatalog';
import type { TowerArchetype } from './towers/types';
import type { TowerRace } from './towers/types';
import type { TowerEquippedUpgrade } from '../config/towerUpgradeCatalog';
import type { TowerUpgradeModifiers } from '../config/towerUpgradeCatalog';
import type { TowerTargetingMode } from '../combat/towerTargeting';
import type { CombatSide } from './combatUnit';

export interface UpgradePickState {
    choices: string[];
}

export interface TowerDraftPickState {
    choices: TowerDefinitionId[];
}

export interface DeploymentSnapshot {
    active: boolean;
    nextTowerId: TowerDefinitionId | null;
    placedCount: number;
    totalCount: number;
    queue: TowerDefinitionId[];
}

export interface GameStateSnapshot {
    gold: number;
    wave: number;
    lives: number;
    canStartWave: boolean;
    raceDraftBias: Record<TowerRace, number>;
    upgradePick: UpgradePickState | null;
    towerDraftPick: TowerDraftPickState | null;
    deployment: DeploymentSnapshot | null;
}

export interface EnemyStateSnapshot {
    id: string;
    side?: CombatSide;
    enemyKind: string;
    position: WorldPosition;
    unitType: string;
    health: number;
    stats: EnemyStatsSnapshot;
    isPreview: boolean;
    isNexus: boolean;
}

export interface PlayerNexusStateSnapshot {
    id: string;
    position: WorldPosition;
    unitType: string;
    health: number;
    maxHealth: number;
    range: number;
    attacksPerSecond: number;
}

export interface PlayerNexusAttackPayload {
    playerNexusId: string;
    targetKind: 'enemy' | 'enemyNexus';
    enemyId: string;
    nexusPosition: WorldPosition;
    targetPosition: WorldPosition;
    damage: number;
    targetHealth: number;
    enemyDied: boolean;
}

export interface TowerStateSnapshot {
    id: string;
    side?: CombatSide;
    position: WorldPosition;
    unitType: string;
    archetype: TowerArchetype;
    race: TowerRace;
    definitionId: TowerDefinitionId;
    range: number;
    damage: number;
    defense: number;
    health: number;
    maxHealth: number;
    attacksPerSecond: number;
    moveSpeedPerTick: number;
    isMobile: boolean;
    goldValue: number;
    weaknesses: DamageType[];
    equippedUpgrades: TowerEquippedUpgrade[];
    /** Purchased between-wave stat upgrade levels keyed by catalog id. */
    statUpgradeLevels: Record<string, number>;
    raceAuraBonus: TowerUpgradeModifiers;
    raceAuraTags: string[];
    targetingMode: TowerTargetingMode;
}

export type UnitSelection =
    | { kind: 'enemy'; data: EnemyStateSnapshot }
    | { kind: 'tower'; data: TowerStateSnapshot }
    | { kind: 'playerNexus'; data: PlayerNexusStateSnapshot };

export interface TowerAttackPayload {
    towerId: string;
    enemyId: string;
    towerPosition: WorldPosition;
    enemyPosition: WorldPosition;
    damage: number;
    enemyHealth: number;
    enemyDied: boolean;
}

export interface EnemyAttackPayload {
    enemyId: string;
    targetKind: 'tower' | 'playerNexus';
    towerId?: string;
    enemyPosition: WorldPosition;
    targetPosition: WorldPosition;
    damage: number;
    targetHealth: number;
}

export interface EnemyNexusAttackPayload {
    enemyNexusId: string;
    targetKind: 'tower' | 'playerNexus';
    towerId?: string;
    nexusPosition: WorldPosition;
    targetPosition: WorldPosition;
    damage: number;
    targetHealth: number;
}
