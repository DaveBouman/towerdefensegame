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
import type { Grid } from '../grid/Grid';
import { TowerUpgradeService } from './TowerUpgradeService';
import type { TowerUpgradeDefinition } from '../config/towerUpgradeCatalog';

export class GameSession
{
    readonly state: GameState;
    readonly clock: GameClock;
    readonly collision: CollisionSystem;
    readonly waves: WaveSystem;
    readonly enemies: EnemySpawnSystem;
    readonly towers: TowerPlacementSystem;
    readonly towerMovement: TowerMovementSystem;
    readonly enemyMovement: EnemyMovementSystem;
    readonly enemyAttacks: EnemyAttackSystem;
    readonly towerAttacks: TowerAttackSystem;
    readonly towerUpgrades: TowerUpgradeService;

    private readonly tickPipeline: readonly TickSystem[];

    constructor (grid: Grid)
    {
        this.state = new GameState();
        this.clock = new GameClock();
        this.collision = new CollisionSystem(grid);
        this.waves = new WaveSystem(this.state);
        this.enemies = new EnemySpawnSystem(this.collision);
        this.towers = new TowerPlacementSystem(grid, this.collision);
        this.towerUpgrades = new TowerUpgradeService();
        this.enemyMovement = new EnemyMovementSystem(
            this.enemies,
            this.towers,
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

        this.enemyAttacks = new EnemyAttackSystem(this.enemies, this.towers, grid, killRewards);
        this.towerAttacks = new TowerAttackSystem(this.towers, this.enemies, grid, killRewards);

        this.tickPipeline = [
            this.enemyMovement,
            this.towerMovement,
            this.enemyAttacks,
            this.towerAttacks,
        ];
    }

    prepare (): void
    {
        this.towerUpgrades.reset();
        this.towers.placePlayer();
        this.towers.placeLongRange();
        this.state.setWave(0);
        this.state.setUpgradePick(null);
        this.state.setCanStartWave(true);
    }

    startWave (): void
    {
        if (!this.state.canStartWave || this.state.upgradePick)
        {
            return;
        }

        this.state.setCanStartWave(false);
        this.waves.startNextWave();
        this.enemies.spawnBasic();
    }

    claimWaveReward (upgradeId: string): boolean
    {
        const claimed = this.towerUpgrades.claimWaveReward(this.state, upgradeId);

        if (claimed)
        {
            this.towerUpgrades.publishInventorySnapshot(this.towers.all);
        }

        return claimed;
    }

    getUnusedUpgradeDefinitions (): TowerUpgradeDefinition[]
    {
        return this.towerUpgrades.getUnusedCatalogUpgrades(this.towers.all);
    }

    equipCatalogUpgradeToTower (towerId: string, upgradeId: string): boolean
    {
        return this.towerUpgrades.equipCatalogUpgrade(this.towers.all, towerId, upgradeId);
    }

    isBetweenWaves (): boolean
    {
        return this.towerUpgrades.isBetweenWaves(this.state, this.enemies.all.length);
    }

    purchaseTowerStatUpgrade (towerId: string, upgradeId: string): boolean
    {
        return this.towerUpgrades.purchaseStatUpgrade(
            this.state,
            this.towers.all,
            towerId,
            upgradeId,
            this.enemies.all.length,
        );
    }

    checkWaveComplete (): void
    {
        if (this.state.wave > 0 && this.enemies.all.length === 0)
        {
            this.resetPlayerTowersAfterWave();
            this.towerUpgrades.offerPostWaveDraft(this.state, this.towers.all);
            this.towerUpgrades.publishInventorySnapshot(this.towers.all);
        }
    }

    private resetPlayerTowersAfterWave (): void
    {
        this.towers.resetPlayerTowers();
        this.towerMovement.clearAll();
        this.towerAttacks.clearAll();
        EventBus.emit(GAME_EVENTS.WAVE_COMPLETED);
    }

    advanceTick (): void
    {
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
        this.towerUpgrades.reset();
    }
}
