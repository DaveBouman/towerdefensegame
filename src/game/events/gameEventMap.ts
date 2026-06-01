import type { Scene } from 'phaser';
import type { TowerUpgradeDefinition } from '../config/towerUpgradeCatalog';
import type { TowerTargetingMode } from '../combat/towerTargeting';
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
    'place-tower-at-tile': { col: number; row: number };
    'relocate-tower-at-tile': { towerId: string; col: number; row: number };
    'claim-wave-reward': { upgradeId: string };
    'discard-wave-reward': void;
    'request-inventory': void;
    'inventory-snapshot': { unused: TowerUpgradeDefinition[] };
    'equip-catalog-upgrade-at-screen': {
        upgradeId: string;
        clientX: number;
        clientY: number;
    };
    'purchase-tower-stat-upgrade': { towerId: string; upgradeId: string };
    'set-tower-targeting-mode': { towerId: string; mode: TowerTargetingMode };
    'camera-scroll-changed': { scrollY: number; maxScrollY: number };
    'set-camera-scroll-y': { scrollY: number };
    'request-camera-scroll': void;
}
