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
import type { TowerState } from './TowerState';
import { rollWaveUpgradeChoiceIds } from './waveUpgradeDraft';
import type { TowerUpgradeDefinition } from '../config/towerUpgradeCatalog';
import { TOWER_UPGRADE_CATALOG } from '../config/towerUpgradeCatalog';

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

    private readonly tickPipeline: readonly TickSystem[];

    constructor (grid: Grid)
    {
        this.state = new GameState();
        this.clock = new GameClock();
        this.collision = new CollisionSystem(grid);
        this.waves = new WaveSystem(this.state);
        this.enemies = new EnemySpawnSystem(this.collision);
        this.towers = new TowerPlacementSystem(grid, this.collision);
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

    pickWaveUpgrade (upgradeId: string): void
    {
        const pick = this.state.upgradePick;

        if (!pick || !pick.choices.includes(upgradeId))
        {
            return;
        }

        const close = this.findCloseTower();

        if (close)
        {
            close.equipUpgrade(upgradeId);
            EventBus.emit(GAME_EVENTS.TOWER_DAMAGED, close.snapshot());
        }

        this.state.setUpgradePick(null);
        this.state.setCanStartWave(true);
    }

    /** Catalog upgrades not equipped on any player tower. */
    getUnusedUpgradeDefinitions (): TowerUpgradeDefinition[]
    {
        const used = new Set<string>();

        for (const tower of this.towers.all)
        {
            for (const u of tower.equippedUpgrades)
            {
                used.add(u.id);
            }
        }

        return TOWER_UPGRADE_CATALOG.filter((d) => !used.has(d.id));
    }

    checkWaveComplete (): void
    {
        if (this.state.wave > 0 && this.enemies.all.length === 0)
        {
            this.resetPlayerTowersAfterWave();
            this.offerPostWaveUpgradeDraft();
        }
    }

    private findCloseTower (): TowerState | undefined
    {
        return this.towers.all.find((t) => t.profile.archetype === 'close');
    }

    private offerPostWaveUpgradeDraft (): void
    {
        const close = this.findCloseTower();

        if (!close)
        {
            this.state.setCanStartWave(true);

            return;
        }

        const equippedIds = close.equippedUpgrades.map((u) => u.id);
        const choices = rollWaveUpgradeChoiceIds(equippedIds);

        if (choices.length === 0)
        {
            this.state.setCanStartWave(true);

            return;
        }

        this.state.setUpgradePick({ choices });
        this.state.setCanStartWave(false);
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
    }
}
