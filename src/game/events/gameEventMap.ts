import type { Scene } from 'phaser';
import type { TowerUpgradeDefinition } from '../config/towerUpgradeCatalog';
import type {
    EnemyStateSnapshot,
    GameStateSnapshot,
    EnemyAttackPayload,
    TowerAttackPayload,
    TowerStateSnapshot,
    UnitSelection,
} from '../domain/types';

export interface GameEventMap {
    'current-scene-ready': Scene;
    'game-state-changed': GameStateSnapshot;
    'enemy-spawned': EnemyStateSnapshot;
    'enemy-removed': { id: string };
    'enemy-selected': EnemyStateSnapshot;
    'enemy-damaged': EnemyStateSnapshot;
    'enemy-attacked': EnemyAttackPayload;
    'tower-placed': TowerStateSnapshot;
    'tower-removed': { id: string };
    'tower-selected': TowerStateSnapshot;
    'tower-attacked': TowerAttackPayload;
    'tower-damaged': TowerStateSnapshot;
    'selection-changed': UnitSelection | null;
    'selection-cleared': void;
    'start-wave': void;
    'wave-completed': void;
    'pick-wave-upgrade': { upgradeId: string };
    'request-inventory': void;
    'inventory-snapshot': { unused: TowerUpgradeDefinition[] };
}
