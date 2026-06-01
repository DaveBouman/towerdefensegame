import { EventBus } from '../EventBus';
import { GAME_EVENTS } from '../events/gameEvents';
import type { GameSession } from '../domain/GameSession';
import {
    ENEMY_BEAM_COLOR,
    ENEMY_IMPACT_COLOR,
    FRIENDLY_BEAM_COLOR,
    FRIENDLY_IMPACT_COLOR,
} from '../config/attackBeamColors';
import type {
    EnemyAttackPayload,
    EnemyStateSnapshot,
    TowerAttackPayload,
    TowerStateSnapshot,
} from '../domain/types';
import type { Grid } from '../grid/Grid';
import { canAddToScene } from './sceneReady';
import { EnemyPresenter } from './EnemyPresenter';
import { RangeIndicator } from './RangeIndicator';
import { SelectionController } from './SelectionController';
import { AttackBeamEffect } from './AttackBeamEffect';
import { TowerPresenter } from './TowerPresenter';
import { TowerDropTarget } from './TowerDropTarget';
import { GridPlacementController } from './GridPlacementController';
import { TowerRelocationController } from './TowerRelocationController';
import type { TowerTargetingMode } from '../combat/towerTargeting';

export class GameSceneController
{
    private readonly rangeIndicator = new RangeIndicator();
    private readonly attackBeamEffect = new AttackBeamEffect();
    private readonly enemyPresenter: EnemyPresenter;
    private readonly towerPresenter: TowerPresenter;
    private readonly selection: SelectionController;
    private readonly towerDropTarget: TowerDropTarget;
    private readonly gridPlacement: GridPlacementController;
    private readonly towerRelocation: TowerRelocationController;

    constructor (
        private readonly scene: Phaser.Scene,
        private readonly grid: Grid,
        private readonly session: GameSession,
    )
    {
        this.enemyPresenter = new EnemyPresenter(
            (id) => this.session.enemies.getSnapshot(id),
        );
        this.towerPresenter = new TowerPresenter(
            (id) => this.session.towers.getSnapshot(id),
            () => !this.session.isDeploymentActive(),
        );
        this.selection = new SelectionController(
            scene,
            grid,
            this.rangeIndicator,
            (id) => this.session.enemies.getSnapshot(id),
            (id) => this.session.towers.getSnapshot(id),
            (id) => this.towerPresenter.getDisplayPosition(id),
        );
        this.towerDropTarget = new TowerDropTarget(
            scene,
            () => this.session.towers.all,
        );
        this.gridPlacement = new GridPlacementController(
            scene,
            grid,
            () => this.session.isDeploymentActive(),
            (tile) =>
            {
                EventBus.emit(GAME_EVENTS.PLACE_TOWER_AT_TILE, {
                    col: tile.col,
                    row: tile.row,
                });
            },
            (pointer) =>
                this.towerDropTarget.pickTowerIdAtWorld({
                    x: pointer.worldX,
                    y: pointer.worldY,
                }) !== null,
        );
        this.towerRelocation = new TowerRelocationController(
            scene,
            grid,
            () => this.session.canRepositionTowers(),
            (world) => this.towerDropTarget.pickTowerIdAtWorld(world),
            () => this.selection.getSelectedTowerId(),
            {
                onRelocate: (towerId, tile) =>
                {
                    EventBus.emit(GAME_EVENTS.RELOCATE_TOWER_AT_TILE, {
                        towerId,
                        col: tile.col,
                        row: tile.row,
                    });
                },
                onDragStart: (towerId, world) => this.towerPresenter.beginDrag(towerId, world),
                onDragMove: (towerId, world) => this.towerPresenter.updateDrag(towerId, world),
                onDragEnd: (towerId) => this.towerPresenter.endDrag(towerId),
                canDropAt: (towerId, tile) => this.session.canRelocateTowerTo(towerId, tile),
            },
        );
    }

    bind (): void
    {
        EventBus.on(GAME_EVENTS.ENEMY_SPAWNED, this.onEnemySpawned, this);
        EventBus.on(GAME_EVENTS.ENEMY_REMOVED, this.onEnemyRemoved, this);
        EventBus.on(GAME_EVENTS.ENEMY_SELECTED, this.onEnemySelected, this);
        EventBus.on(GAME_EVENTS.ENEMY_DAMAGED, this.onEnemyDamaged, this);
        EventBus.on(GAME_EVENTS.TOWER_PLACED, this.onTowerPlaced, this);
        EventBus.on(GAME_EVENTS.TOWER_REMOVED, this.onTowerRemoved, this);
        EventBus.on(GAME_EVENTS.TOWER_SELECTED, this.onTowerSelected, this);
        EventBus.on(GAME_EVENTS.SELECTION_CLEARED, this.onSelectionCleared, this);
        EventBus.on(GAME_EVENTS.TOWER_ATTACKED, this.onTowerAttacked, this);
        EventBus.on(GAME_EVENTS.ENEMY_ATTACKED, this.onEnemyAttacked, this);
        EventBus.on(GAME_EVENTS.TOWER_DAMAGED, this.onTowerDamaged, this);
        EventBus.on(GAME_EVENTS.START_WAVE, this.onStartWave, this);
        EventBus.on(GAME_EVENTS.WAVE_COMPLETED, this.onWaveCompleted, this);
        EventBus.on(GAME_EVENTS.CLAIM_WAVE_REWARD, this.onClaimWaveReward, this);
        EventBus.on(GAME_EVENTS.DISCARD_WAVE_REWARD, this.onDiscardWaveReward, this);
        EventBus.on(GAME_EVENTS.REQUEST_INVENTORY, this.onRequestInventory, this);
        EventBus.on(
            GAME_EVENTS.EQUIP_CATALOG_UPGRADE_AT_SCREEN,
            this.onEquipCatalogUpgradeAtScreen,
            this,
        );
        EventBus.on(GAME_EVENTS.PURCHASE_TOWER_STAT_UPGRADE, this.onPurchaseTowerStatUpgrade, this);
        EventBus.on(GAME_EVENTS.SET_TOWER_TARGETING_MODE, this.onSetTowerTargetingMode, this);
        EventBus.on(GAME_EVENTS.PLACE_TOWER_AT_TILE, this.onPlaceTowerAtTile, this);
        EventBus.on(GAME_EVENTS.RELOCATE_TOWER_AT_TILE, this.onRelocateTowerAtTile, this);
    }

    unbind (): void
    {
        EventBus.off(GAME_EVENTS.ENEMY_SPAWNED, this.onEnemySpawned, this);
        EventBus.off(GAME_EVENTS.ENEMY_REMOVED, this.onEnemyRemoved, this);
        EventBus.off(GAME_EVENTS.ENEMY_SELECTED, this.onEnemySelected, this);
        EventBus.off(GAME_EVENTS.ENEMY_DAMAGED, this.onEnemyDamaged, this);
        EventBus.off(GAME_EVENTS.TOWER_PLACED, this.onTowerPlaced, this);
        EventBus.off(GAME_EVENTS.TOWER_REMOVED, this.onTowerRemoved, this);
        EventBus.off(GAME_EVENTS.TOWER_SELECTED, this.onTowerSelected, this);
        EventBus.off(GAME_EVENTS.SELECTION_CLEARED, this.onSelectionCleared, this);
        EventBus.off(GAME_EVENTS.TOWER_ATTACKED, this.onTowerAttacked, this);
        EventBus.off(GAME_EVENTS.ENEMY_ATTACKED, this.onEnemyAttacked, this);
        EventBus.off(GAME_EVENTS.TOWER_DAMAGED, this.onTowerDamaged, this);
        EventBus.off(GAME_EVENTS.START_WAVE, this.onStartWave, this);
        EventBus.off(GAME_EVENTS.WAVE_COMPLETED, this.onWaveCompleted, this);
        EventBus.off(GAME_EVENTS.CLAIM_WAVE_REWARD, this.onClaimWaveReward, this);
        EventBus.off(GAME_EVENTS.DISCARD_WAVE_REWARD, this.onDiscardWaveReward, this);
        EventBus.off(GAME_EVENTS.REQUEST_INVENTORY, this.onRequestInventory, this);
        EventBus.off(
            GAME_EVENTS.EQUIP_CATALOG_UPGRADE_AT_SCREEN,
            this.onEquipCatalogUpgradeAtScreen,
            this,
        );
        EventBus.off(GAME_EVENTS.PURCHASE_TOWER_STAT_UPGRADE, this.onPurchaseTowerStatUpgrade, this);
        EventBus.off(GAME_EVENTS.SET_TOWER_TARGETING_MODE, this.onSetTowerTargetingMode, this);
        EventBus.off(GAME_EVENTS.PLACE_TOWER_AT_TILE, this.onPlaceTowerAtTile, this);
        EventBus.off(GAME_EVENTS.RELOCATE_TOWER_AT_TILE, this.onRelocateTowerAtTile, this);
    }

    startSession (): void
    {
        if (!canAddToScene(this.scene))
        {
            return;
        }

        this.session.prepare();
    }

    private onStartWave (): void
    {
        if (!canAddToScene(this.scene))
        {
            return;
        }

        this.session.startWave();
    }

    private onClaimWaveReward ({ upgradeId }: { upgradeId: string }): void
    {
        this.session.claimWaveReward(upgradeId);
    }

    private onDiscardWaveReward (): void
    {
        this.session.discardWaveReward();
    }

    private onRequestInventory (): void
    {
        this.session.towerUpgrades.publishInventorySnapshot();
    }

    private onPurchaseTowerStatUpgrade ({
        towerId,
        upgradeId,
    }: {
        towerId: string;
        upgradeId: string;
    }): void
    {
        this.session.purchaseTowerStatUpgrade(towerId, upgradeId);
    }

    private onSetTowerTargetingMode ({
        towerId,
        mode,
    }: {
        towerId: string;
        mode: TowerTargetingMode;
    }): void
    {
        this.session.setTowerTargetingMode(towerId, mode);
    }

    private onEquipCatalogUpgradeAtScreen ({
        upgradeId,
        clientX,
        clientY,
    }: {
        upgradeId: string;
        clientX: number;
        clientY: number;
    }): void
    {
        if (!canAddToScene(this.scene))
        {
            return;
        }

        const towerId = this.towerDropTarget.resolveTowerIdAtScreen(clientX, clientY);

        if (!towerId)
        {
            return;
        }

        this.session.equipCatalogUpgradeToTower(towerId, upgradeId);
    }

    private onWaveCompleted (): void
    {
        for (const tower of this.session.towers.all)
        {
            this.towerPresenter.setTargetPosition(tower.id, tower.position);
            this.towerPresenter.snapToTarget(tower.id);
            this.towerPresenter.setHealth(tower.id, tower.health, tower.maxHealth);
        }

        this.selection.syncFrame();
    }

    /**
     * Simulation positions → visual targets, then lerp sprites every render frame.
     */
    syncPresentation (deltaMs: number): void
    {
        for (const enemy of this.session.enemies.all)
        {
            this.enemyPresenter.setTargetPosition(enemy.id, enemy.position);
            this.enemyPresenter.setHealth(enemy.id, enemy.health, enemy.maxHealth);
        }

        for (const tower of this.session.towers.all)
        {
            this.towerPresenter.setTargetPosition(tower.id, tower.position);
            this.towerPresenter.setHealth(tower.id, tower.health, tower.maxHealth);
        }

        this.towerPresenter.setRelocateMode(this.session.canRepositionTowers());

        this.enemyPresenter.lerpFrame(deltaMs);
        this.towerPresenter.lerpFrame(deltaMs);
        this.selection.syncFrame();
    }

    destroy (): void
    {
        this.unbind();
        this.gridPlacement.destroy();
        this.towerRelocation.destroy();
        this.enemyPresenter.clearAll();
        this.towerPresenter.clearAll();
        this.selection.clear();
        this.rangeIndicator.destroy();
        this.attackBeamEffect.destroy();
    }

    private onPlaceTowerAtTile ({ col, row }: { col: number; row: number }): void
    {
        this.session.tryDeployTowerAt({ col, row });
    }

    private onRelocateTowerAtTile ({
        towerId,
        col,
        row,
    }: {
        towerId: string;
        col: number;
        row: number;
    }): void
    {
        const snapshot = this.session.towers.getSnapshot(towerId);

        if (!snapshot)
        {
            return;
        }

        const moved = this.session.relocateTowerAt({ col, row }, towerId);
        const next = this.session.towers.getSnapshot(towerId);

        if (next)
        {
            this.towerPresenter.setTargetPosition(towerId, next.position);
            this.towerPresenter.snapToTarget(towerId);
        }
        else if (!moved)
        {
            this.towerPresenter.setTargetPosition(towerId, snapshot.position);
            this.towerPresenter.snapToTarget(towerId);
        }

        this.selection.syncFrame();
    }

    private onEnemySpawned (snapshot: EnemyStateSnapshot): void
    {
        if (!canAddToScene(this.scene))
        {
            return;
        }

        this.enemyPresenter.spawn(this.scene, this.grid, snapshot);
    }

    private onEnemyRemoved ({ id }: { id: string }): void
    {
        this.selection.onEnemyRemoved(id);
        this.session.enemyAttacks.clearEnemy(id);
        this.session.enemyMovement.clearEnemy(id);
        this.enemyPresenter.remove(id);
        this.session.checkWaveComplete();
    }

    private onEnemySelected (snapshot: EnemyStateSnapshot): void
    {
        this.selection.selectEnemy(snapshot);
    }

    private onEnemyDamaged (snapshot: EnemyStateSnapshot): void
    {
        this.selection.onEnemyDamaged(snapshot);
        this.enemyPresenter.flashHit(snapshot.id);
    }

    private onTowerPlaced (snapshot: TowerStateSnapshot): void
    {
        if (!canAddToScene(this.scene))
        {
            return;
        }

        this.towerPresenter.place(this.scene, this.grid, snapshot);
        this.towerPresenter.setRelocateMode(this.session.canRepositionTowers());
    }

    private onTowerRemoved ({ id }: { id: string }): void
    {
        this.selection.onTowerRemoved(id);
        this.session.towerAttacks.clearTower(id);
        this.session.towerMovement.clearTower(id);
        this.towerPresenter.remove(id);
    }

    private onTowerSelected (snapshot: TowerStateSnapshot): void
    {
        this.selection.selectTower(snapshot);
    }

    private onSelectionCleared (): void
    {
        this.selection.clearFromUi();
    }

    private onTowerDamaged (snapshot: TowerStateSnapshot): void
    {
        this.selection.onTowerDamaged(snapshot);
        this.towerPresenter.setHealth(snapshot.id, snapshot.health, snapshot.maxHealth);
    }

    private onTowerAttacked (payload: TowerAttackPayload): void
    {
        if (!canAddToScene(this.scene))
        {
            return;
        }

        this.attackBeamEffect.play(
            this.scene,
            payload.towerPosition,
            payload.enemyPosition,
            { beam: FRIENDLY_BEAM_COLOR, impact: FRIENDLY_IMPACT_COLOR },
        );
        this.towerPresenter.playAttack(payload.towerId);
    }

    private onEnemyAttacked (payload: EnemyAttackPayload): void
    {
        if (!canAddToScene(this.scene))
        {
            return;
        }

        this.attackBeamEffect.play(
            this.scene,
            payload.enemyPosition,
            payload.towerPosition,
            { beam: ENEMY_BEAM_COLOR, impact: ENEMY_IMPACT_COLOR },
        );
    }
}
