import type { Scene } from 'phaser';
import type { TowerDefinitionId } from '../config/towerCatalog';
import type { TowerUpgradeDefinition } from '../config/towerUpgradeCatalog';
import type { TowerTargetingMode } from '../combat/towerTargeting';
import type {
    EnemyStateSnapshot,
    EnemyNexusAttackPayload,
    GameStateSnapshot,
    EnemyAttackPayload,
    PlayerNexusAttackPayload,
    PlayerNexusStateSnapshot,
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
    'enemy-nexus-attacked': EnemyNexusAttackPayload;
    'player-nexus-spawned': PlayerNexusStateSnapshot;
    'player-nexus-attacked': PlayerNexusAttackPayload;
    'player-nexus-damaged': PlayerNexusStateSnapshot;
    'player-nexus-destroyed': PlayerNexusStateSnapshot;
    'tower-placed': TowerStateSnapshot;
    'tower-removed': { id: string };
    'tower-selected': TowerStateSnapshot;
    'tower-attacked': TowerAttackPayload;
    'tower-damaged': TowerStateSnapshot;
    'selection-changed': UnitSelection | null;
    'selection-cleared': void;
    'start-wave': void;
    'toggle-pause': void;
    'wave-completed': void;
    'place-queued-tower-at-screen': { towerId: TowerDefinitionId; clientX: number; clientY: number };
    'sell-tower': { towerId: string };
    'confirm-tower-draft': { towerId: TowerDefinitionId };
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
