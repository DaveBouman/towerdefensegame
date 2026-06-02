import { GameState } from './GameState';
import type { TickSystem } from './TickSystem';
import { EnemyAttackSystem } from '../systems/EnemyAttackSystem';
import { EnemySpawnSystem } from '../systems/EnemySpawnSystem';
import { EnemyMovementSystem } from '../systems/EnemyMovementSystem';
import { GameClock } from '../systems/GameClock';
import { CollisionSystem } from '../systems/CollisionSystem';
import { TowerAttackSystem } from '../systems/TowerAttackSystem';
import { TowerMovementSystem } from '../systems/TowerMovementSystem';
import { TowerPlacementSystem } from '../systems/TowerPlacementSystem';
import { KillRewardSystem } from '../systems/KillRewardSystem';
import { EventBus } from '../EventBus';
import { GAME_EVENTS } from '../events/gameEvents';
import { WaveSystem } from '../systems/WaveSystem';
import { WaveSpawnSystem } from '../systems/WaveSpawnSystem';
import type { Grid } from '../grid/Grid';
import type { GridPosition } from '../grid/types';
import { DeploymentPhase } from './DeploymentPhase';
import { TowerUpgradeService } from './TowerUpgradeService';
import type { TowerUpgradeDefinition } from '../config/towerUpgradeCatalog';
import { WaveRoundController } from './WaveRoundController';
import type { TowerTargetingMode } from '../combat/towerTargeting';
import type { TowerDefinitionId } from '../config/towerCatalog';
import { rollTowerDraftChoices } from '../config/towerDraft';
import {
    isEnemyNexusDefeated,
    isPlayerNexusDefeated,
    isWaveRoundComplete,
} from '../combat/roundOutcome';
import { PlayerNexusSystem } from '../systems/PlayerNexusSystem';
import { EnemyNexusAttackSystem } from '../systems/EnemyNexusAttackSystem';
import { PlayerNexusAttackSystem } from '../systems/PlayerNexusAttackSystem';

export class GameSession
{
    readonly state: GameState;
    readonly clock: GameClock;
    readonly collision: CollisionSystem;
    readonly waves: WaveSystem;
    readonly waveSpawns: WaveSpawnSystem;
    readonly enemies: EnemySpawnSystem;
    readonly towers: TowerPlacementSystem;
    readonly towerMovement: TowerMovementSystem;
    readonly enemyMovement: EnemyMovementSystem;
    readonly enemyAttacks: EnemyAttackSystem;
    readonly towerAttacks: TowerAttackSystem;
    readonly towerUpgrades: TowerUpgradeService;
    readonly playerNexus: PlayerNexusSystem;
    readonly deployment: DeploymentPhase;

    private readonly waveRounds: WaveRoundController;
    private readonly tickPipeline: readonly TickSystem[];

    constructor (grid: Grid)
    {
        this.state = new GameState();
        this.clock = new GameClock();
        this.collision = new CollisionSystem(grid.layout.arenaPixelSize());
        this.waves = new WaveSystem(this.state);
        this.enemies = new EnemySpawnSystem(this.collision);
        this.waveSpawns = new WaveSpawnSystem(this.enemies);
        this.towers = new TowerPlacementSystem(grid, this.collision);
        this.towerUpgrades = new TowerUpgradeService();
        this.playerNexus = new PlayerNexusSystem();
        this.deployment = new DeploymentPhase();
        this.enemyMovement = new EnemyMovementSystem(
            this.enemies,
            this.towers,
            this.playerNexus,
            grid,
            this.collision,
        );
        this.towerMovement = new TowerMovementSystem(
            this.towers,
            this.enemies,
            grid,
            this.collision,
        );
        const killRewards = new KillRewardSystem(this.state);

        this.enemyAttacks = new EnemyAttackSystem(
            this.enemies,
            this.towers,
            this.playerNexus,
            grid,
            killRewards,
        );
        this.towerAttacks = new TowerAttackSystem(
            this.towers,
            this.enemies,
            grid,
            killRewards,
        );
        const enemyNexusAttacks = new EnemyNexusAttackSystem(
            this.enemies,
            this.towers,
            this.playerNexus,
            grid,
            killRewards,
            () => this.state.wave,
        );
        const playerNexusAttacks = new PlayerNexusAttackSystem(
            this.playerNexus,
            this.enemies,
            grid,
            killRewards,
            () => this.state.wave,
        );

        this.waveRounds = new WaveRoundController(
            this.state,
            this.clock,
            this.waves,
            this.waveSpawns,
            this.enemies,
            this.towers,
            this.towerMovement,
            this.towerAttacks,
            this.enemyMovement,
            this.deployment,
        );

        this.tickPipeline = [
            this.waveSpawns,
            this.enemyMovement,
            this.towerMovement,
            this.enemyAttacks,
            enemyNexusAttacks,
            this.towerAttacks,
            playerNexusAttacks,
        ];
    }

    prepare (): void
    {
        this.towerUpgrades.reset();
        this.playerNexus.reset();
        this.enemies.clearAll();
        this.towers.clearAll();
        this.waveSpawns.clear();
        this.deployment.reset();
        this.playerNexus.spawn();
        this.enemies.resetEnemyNexus();
        this.state.setLives(this.playerNexus.active?.maxHealth ?? this.state.lives);
        this.state.setWave(0);
        this.state.setUpgradePick(null);
        this.state.setTowerDraftPick({ choices: rollTowerDraftChoices(0, 5) });
        this.state.setCanStartWave(false);
        this.state.setDeployment(null);
        this.clock.reset();
        this.waveRounds.showUpcomingWavePreview();
    }

    isDeploymentActive (): boolean
    {
        return this.deployment.active;
    }

    canPlaceQueuedTowers (): boolean
    {
        if (this.isRoundActive() || this.state.upgradePick || this.state.towerDraftPick)
        {
            return false;
        }

        return this.deployment.hasQueuedTowers;
    }

    /** Simulation ticks run only during an active combat round. */
    isRoundActive (): boolean
    {
        return WaveRoundController.isCombatActive(this.state);
    }

    /** True during deployment or between waves (not combat / reward pick). */
    isTowerDraftActive (): boolean
    {
        return this.state.towerDraftPick !== null;
    }

    confirmTowerDraft (definitionId: TowerDefinitionId): boolean
    {
        const pick = this.state.towerDraftPick;

        if (!pick || !pick.choices.includes(definitionId))
        {
            return false;
        }

        this.state.setTowerDraftPick(null);
        this.towers.snapAllToSpawnTiles();
        this.towerMovement.clearAll();
        this.deployment.beginWithQueue([ definitionId ]);
        this.state.setCanStartWave(true);
        this.syncDeploymentState();

        return true;
    }

    canRepositionTowers (): boolean
    {
        if (this.state.upgradePick || this.state.towerDraftPick || this.isRoundActive())
        {
            return false;
        }

        return this.deployment.active || this.isBetweenWaves();
    }

    canRelocateTowerTo (towerId: string, tile: GridPosition): boolean
    {
        return this.towers.canRelocateTo(towerId, tile);
    }

    relocateTowerAt (tile: GridPosition, towerId: string): boolean
    {
        if (!this.canRepositionTowers())
        {
            return false;
        }

        if (!this.towers.tryRelocate(towerId, tile))
        {
            return false;
        }

        this.towerMovement.clearTower(towerId);
        this.towerAttacks.clearTower(towerId);

        return true;
    }

    tryDeployTowerAt (tile: GridPosition, towerId?: TowerDefinitionId): boolean
    {
        const queuedTowerId = towerId ?? this.deployment.peekNext();

        if (!queuedTowerId)
        {
            return false;
        }

        if (!this.towers.tryPlace(tile, queuedTowerId))
        {
            return false;
        }

        if (towerId)
        {
            this.deployment.takeById(towerId);
        }
        else
        {
            this.deployment.takeNext();
        }

        this.syncDeploymentState();
        this.state.setCanStartWave(true);
        this.waveRounds.showUpcomingWavePreview();

        return true;
    }

    startWave (): void
    {
        this.waveRounds.startCombatRound();
    }

    claimWaveReward (upgradeId: string): boolean
    {
        const claimed = this.towerUpgrades.claimWaveReward(this.state, upgradeId);

        if (claimed)
        {
            this.towerUpgrades.publishInventorySnapshot();
            this.beginPostWaveTowerDraft();
        }

        return claimed;
    }

    discardWaveReward (): boolean
    {
        const discarded = this.towerUpgrades.discardWaveReward(this.state);

        if (discarded)
        {
            this.towerUpgrades.publishInventorySnapshot();
            this.beginPostWaveTowerDraft();
        }

        return discarded;
    }

    getInventoryUpgradeDefinitions (): TowerUpgradeDefinition[]
    {
        return this.towerUpgrades.getInventoryUpgrades();
    }

    equipCatalogUpgradeToTower (towerId: string, upgradeId: string): boolean
    {
        return this.towerUpgrades.equipCatalogUpgrade(this.towers.all, towerId, upgradeId);
    }

    setTowerTargetingMode (towerId: string, mode: TowerTargetingMode): boolean
    {
        const tower = this.towers.all.find((t) => t.id === towerId);

        if (!tower)
        {
            return false;
        }

        tower.setTargetingMode(mode);
        EventBus.emit(GAME_EVENTS.TOWER_DAMAGED, tower.snapshot());

        return true;
    }

    isBetweenWaves (): boolean
    {
        return this.towerUpgrades.isBetweenWaves(this.state, this.enemies.livingCombatCount);
    }

    purchaseTowerStatUpgrade (towerId: string, upgradeId: string): boolean
    {
        return this.towerUpgrades.purchaseStatUpgrade(
            this.state,
            this.towers.all,
            towerId,
            upgradeId,
            this.enemies.livingCombatCount,
        );
    }

    checkWaveComplete (): void
    {
        if (!this.isRoundActive())
        {
            return;
        }

        if (isPlayerNexusDefeated(this.playerNexus.active))
        {
            this.finishWave();

            return;
        }

        if (isEnemyNexusDefeated(this.enemies.getEnemyNexus()))
        {
            this.finishWave();

            return;
        }

        if (
            isWaveRoundComplete(
                this.enemies.all,
                this.towers.all,
                this.waveSpawns.hasPendingSpawns,
            )
        )
        {
            this.finishWave();
        }
    }

    private finishWave (): void
    {
        this.resetPlayerTowersAfterWave();
        this.towerUpgrades.offerPostWaveDraft(this.state);
        this.towerUpgrades.publishInventorySnapshot();

        if (!this.state.upgradePick)
        {
            this.beginPostWaveTowerDraft();
        }
    }

    /** After wave 1+, draft one extra tower to place before the next wave. */
    private beginPostWaveTowerDraft (): void
    {
        if (this.state.wave < 1 || this.state.towerDraftPick)
        {
            return;
        }

        this.state.setTowerDraftPick({ choices: rollTowerDraftChoices(this.state.wave, 5) });
        this.state.setCanStartWave(false);
    }

    advanceTick (): void
    {
        if (!this.isRoundActive())
        {
            return;
        }

        const gameTick = this.clock.step();

        for (const system of this.tickPipeline)
        {
            system.tick(gameTick);
        }
    }

    reset (): void
    {
        this.clock.reset();
        this.collision.clear();
        this.waveSpawns.clear();
        this.towerUpgrades.reset();
        this.playerNexus.reset();
        this.deployment.reset();
        this.state.setDeployment(null);
    }

    syncLivesFromPlayerNexus (): void
    {
        const nexus = this.playerNexus.active;

        if (nexus)
        {
            this.state.setLives(nexus.health);
        }
    }

    private resetPlayerTowersAfterWave (): void
    {
        this.towers.resetPlayerTowers();
        this.towerMovement.clearAll();
        this.towerAttacks.clearAll();
        EventBus.emit(GAME_EVENTS.WAVE_COMPLETED);
    }

    private syncDeploymentState (): void
    {
        if (this.deployment.active)
        {
            this.state.setDeployment(this.deployment.snapshot());
        }
        else
        {
            this.state.setDeployment(null);
        }
    }
}
