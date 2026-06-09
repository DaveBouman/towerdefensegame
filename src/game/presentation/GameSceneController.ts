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
    EnemyNexusAttackPayload,
    EnemyStateSnapshot,
    PlayerNexusAttackPayload,
    PlayerNexusStateSnapshot,
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
import { TowerRelocationController } from './TowerRelocationController';
import { PlayerNexusPresenter } from './PlayerNexusPresenter';
import { TowerLinkIndicator } from './TowerLinkIndicator';
import type { TowerTargetingMode } from '../combat/towerTargeting';
import type { TowerDefinitionId } from '../config/towerCatalog';
import { clientPointerToWorld } from './clientPointerToWorld';

export class GameSceneController
{
    private readonly rangeIndicator = new RangeIndicator();
    private readonly towerLinkIndicator = new TowerLinkIndicator();
    private readonly towerFusionIndicator = new TowerLinkIndicator(0xe74c3c, 0.95);
    private readonly attackBeamEffect = new AttackBeamEffect();
    private readonly enemyPresenter: EnemyPresenter;
    private readonly towerPresenter: TowerPresenter;
    private readonly selection: SelectionController;
    private readonly towerDropTarget: TowerDropTarget;
    private readonly towerRelocation: TowerRelocationController;
    private readonly playerNexusPresenter: PlayerNexusPresenter;

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
            () => true,
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
        this.playerNexusPresenter = new PlayerNexusPresenter(() =>
        {
            const snapshot = this.session.playerNexus.getSnapshot();

            if (snapshot)
            {
                this.selection.selectPlayerNexus(snapshot);
            }
        });
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
        EventBus.on(GAME_EVENTS.TOWER_UPDATED, this.onTowerUpdated, this);
        EventBus.on(GAME_EVENTS.TOWER_DISABLED, this.onTowerDisabled, this);
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
        EventBus.on(
            GAME_EVENTS.PLACE_QUEUED_TOWER_AT_SCREEN,
            this.onPlaceQueuedTowerAtScreen,
            this,
        );
        EventBus.on(GAME_EVENTS.SELL_TOWER, this.onSellTower, this);
        EventBus.on(GAME_EVENTS.RELOCATE_TOWER_AT_TILE, this.onRelocateTowerAtTile, this);
        EventBus.on(GAME_EVENTS.CONFIRM_TOWER_DRAFT, this.onConfirmTowerDraft, this);
        EventBus.on(GAME_EVENTS.SKIP_TOWER_DRAFT, this.onSkipTowerDraft, this);
        EventBus.on(GAME_EVENTS.PLAYER_NEXUS_SPAWNED, this.onPlayerNexusSpawned, this);
        EventBus.on(GAME_EVENTS.PLAYER_NEXUS_DAMAGED, this.onPlayerNexusDamaged, this);
        EventBus.on(GAME_EVENTS.PLAYER_NEXUS_DESTROYED, this.onPlayerNexusDestroyed, this);
        EventBus.on(GAME_EVENTS.PLAYER_NEXUS_ATTACKED, this.onPlayerNexusAttacked, this);
        EventBus.on(GAME_EVENTS.ENEMY_NEXUS_ATTACKED, this.onEnemyNexusAttacked, this);
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
        EventBus.off(GAME_EVENTS.TOWER_UPDATED, this.onTowerUpdated, this);
        EventBus.off(GAME_EVENTS.TOWER_DISABLED, this.onTowerDisabled, this);
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
        EventBus.off(
            GAME_EVENTS.PLACE_QUEUED_TOWER_AT_SCREEN,
            this.onPlaceQueuedTowerAtScreen,
            this,
        );
        EventBus.off(GAME_EVENTS.SELL_TOWER, this.onSellTower, this);
        EventBus.off(GAME_EVENTS.RELOCATE_TOWER_AT_TILE, this.onRelocateTowerAtTile, this);
        EventBus.off(GAME_EVENTS.CONFIRM_TOWER_DRAFT, this.onConfirmTowerDraft, this);
        EventBus.off(GAME_EVENTS.SKIP_TOWER_DRAFT, this.onSkipTowerDraft, this);
        EventBus.off(GAME_EVENTS.PLAYER_NEXUS_SPAWNED, this.onPlayerNexusSpawned, this);
        EventBus.off(GAME_EVENTS.PLAYER_NEXUS_DAMAGED, this.onPlayerNexusDamaged, this);
        EventBus.off(GAME_EVENTS.PLAYER_NEXUS_DESTROYED, this.onPlayerNexusDestroyed, this);
        EventBus.off(GAME_EVENTS.PLAYER_NEXUS_ATTACKED, this.onPlayerNexusAttacked, this);
        EventBus.off(GAME_EVENTS.ENEMY_NEXUS_ATTACKED, this.onEnemyNexusAttacked, this);
    }

    startSession (): void
    {
        if (!canAddToScene(this.scene))
        {
            return;
        }

        this.session.prepare();
        this.syncNexusesToScene();
    }

    private syncNexusesToScene (): void
    {
        const player = this.session.playerNexus.getSnapshot();

        if (player)
        {
            this.playerNexusPresenter.destroy();
            this.playerNexusPresenter.spawn(this.scene, this.grid, player);
        }

        const enemyNexus = this.session.enemies.getEnemyNexus();

        if (enemyNexus)
        {
            this.enemyPresenter.remove(enemyNexus.id);
            this.onEnemySpawned(enemyNexus.snapshot());
        }
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

        this.syncTowerLinks();
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
        this.syncTowerLinks();
        this.selection.syncFrame();
    }

    destroy (): void
    {
        this.unbind();
        this.towerRelocation.destroy();
        this.enemyPresenter.clearAll();
        this.towerPresenter.clearAll();
        this.playerNexusPresenter.destroy();
        this.selection.clear();
        this.rangeIndicator.destroy();
        this.towerLinkIndicator.destroy();
        this.towerFusionIndicator.destroy();
        this.attackBeamEffect.destroy();
    }

    private syncTowerLinks (): void
    {
        if (!canAddToScene(this.scene))
        {
            return;
        }

        const links = this.session.raceBonuses.getActivePairLinks();

        const resolvePosition = (towerId: string) =>
            this.towerPresenter.getDisplayPosition(towerId)
            ?? this.session.towers.getSnapshot(towerId)?.position;

        this.towerLinkIndicator.sync(this.scene, links, resolvePosition);
        this.towerFusionIndicator.sync(
            this.scene,
            this.session.getPendingTowerFusionLinks(),
            resolvePosition,
        );
    }

    private onPlaceQueuedTowerAtScreen ({
        towerId,
        clientX,
        clientY,
    }: {
        towerId: TowerDefinitionId;
        clientX: number;
        clientY: number;
    }): void
    {
        if (!canAddToScene(this.scene))
        {
            return;
        }

        const world = clientPointerToWorld(this.scene, clientX, clientY);

        if (!world)
        {
            return;
        }

        const tile = this.grid.toGrid(world.x, world.y);

        if (!tile)
        {
            return;
        }

        this.session.tryDeployTowerAt(tile, towerId);
    }

    private onSellTower ({ towerId }: { towerId: string }): void
    {
        this.session.sellTower(towerId);
    }

    private onConfirmTowerDraft ({ towerId }: { towerId: TowerDefinitionId }): void
    {
        this.session.confirmTowerDraft(towerId);
    }

    private onSkipTowerDraft (): void
    {
        this.session.skipTowerDraft();
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

        this.syncTowerLinks();
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
        this.session.unitAttacks.clearEnemy(id);
        this.session.unitMovement.clearEnemy(id);
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
        this.enemyPresenter.setHealth(snapshot.id, snapshot.health, snapshot.stats.maxHealth);

        if (snapshot.isNexus)
        {
            this.session.checkWaveComplete();
        }
    }

    private onTowerPlaced (snapshot: TowerStateSnapshot): void
    {
        if (!canAddToScene(this.scene))
        {
            return;
        }

        this.towerPresenter.place(this.scene, this.grid, snapshot);
        this.towerPresenter.setRelocateMode(this.session.canRepositionTowers());
        this.syncTowerLinks();
    }

    private onTowerRemoved ({ id }: { id: string }): void
    {
        this.selection.onTowerRemoved(id);
        this.session.unitAttacks.clearTower(id);
        this.session.unitMovement.clearTower(id);
        this.towerPresenter.remove(id);
        this.syncTowerLinks();
        this.session.checkWaveComplete();
    }

    private onTowerSelected (snapshot: TowerStateSnapshot): void
    {
        this.selection.selectTower(snapshot);
    }

    private onSelectionCleared (): void
    {
        this.selection.clearFromUi();
    }

    private refreshTowerPresentation (snapshot: TowerStateSnapshot): void
    {
        this.towerPresenter.setTargetPosition(snapshot.id, snapshot.position);

        if (!this.session.isRoundActive())
        {
            this.towerPresenter.snapToTarget(snapshot.id);
        }

        this.selection.onTowerDamaged(snapshot);
        this.towerPresenter.setHealth(snapshot.id, snapshot.health, snapshot.maxHealth);
        this.syncTowerLinks();
    }

    private onTowerDamaged (snapshot: TowerStateSnapshot): void
    {
        this.refreshTowerPresentation(snapshot);
    }

    private onTowerUpdated (snapshot: TowerStateSnapshot): void
    {
        this.refreshTowerPresentation(snapshot);
    }

    private onTowerDisabled (): void
    {
        this.session.checkWaveComplete();
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
            payload.targetPosition,
            { beam: ENEMY_BEAM_COLOR, impact: ENEMY_IMPACT_COLOR },
        );
    }

    private onEnemyNexusAttacked (payload: EnemyNexusAttackPayload): void
    {
        if (!canAddToScene(this.scene))
        {
            return;
        }

        this.attackBeamEffect.play(
            this.scene,
            payload.nexusPosition,
            payload.targetPosition,
            { beam: 0x9b59b6, impact: ENEMY_IMPACT_COLOR },
        );
    }

    private onPlayerNexusAttacked (payload: PlayerNexusAttackPayload): void
    {
        if (!canAddToScene(this.scene))
        {
            return;
        }

        this.attackBeamEffect.play(
            this.scene,
            payload.nexusPosition,
            payload.targetPosition,
            { beam: FRIENDLY_BEAM_COLOR, impact: FRIENDLY_IMPACT_COLOR },
        );
    }

    private onPlayerNexusSpawned (snapshot: PlayerNexusStateSnapshot): void
    {
        if (!canAddToScene(this.scene))
        {
            return;
        }

        this.playerNexusPresenter.spawn(this.scene, this.grid, snapshot);
    }

    private onPlayerNexusDamaged (snapshot: PlayerNexusStateSnapshot): void
    {
        this.session.syncLivesFromPlayerNexus();
        this.playerNexusPresenter.setHealth(snapshot.health, snapshot.maxHealth);
        this.selection.syncFrame();
        this.session.checkWaveComplete();
    }

    private onPlayerNexusDestroyed (): void
    {
        this.session.checkWaveComplete();
    }
}
