import type { WorldPosition } from '../grid/types';
import type { DamageType, EnemyStatsSnapshot } from './combat/types';
import type { TowerArchetype } from './towers/types';
import type { TowerEquippedUpgrade } from '../config/towerUpgradeCatalog';

export interface UpgradePickState {
    choices: string[];
}

export interface DeploymentSnapshot {
    active: boolean;
    nextArchetype: TowerArchetype | null;
    placedCount: number;
    totalCount: number;
}

export interface GameStateSnapshot {
    gold: number;
    wave: number;
    lives: number;
    canStartWave: boolean;
    upgradePick: UpgradePickState | null;
    deployment: DeploymentSnapshot | null;
}

export interface EnemyStateSnapshot {
    id: string;
    position: WorldPosition;
    unitType: string;
    health: number;
    stats: EnemyStatsSnapshot;
    isPreview: boolean;
}

export interface TowerStateSnapshot {
    id: string;
    position: WorldPosition;
    unitType: string;
    archetype: TowerArchetype;
    range: number;
    damage: number;
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
}

export type UnitSelection =
    | { kind: 'enemy'; data: EnemyStateSnapshot }
    | { kind: 'tower'; data: TowerStateSnapshot };

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
    towerId: string;
    enemyPosition: WorldPosition;
    towerPosition: WorldPosition;
    damage: number;
    towerHealth: number;
}
