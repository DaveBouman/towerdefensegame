import { GameState } from './GameState';
import type { TickSystem } from './TickSystem';
import { EnemySpawnSystem } from '../systems/EnemySpawnSystem';
import { GameClock } from '../systems/GameClock';
import { CollisionSystem } from '../systems/CollisionSystem';
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
import type { WaveTowerDamageLog } from './types';
import { WaveRoundController } from './WaveRoundController';
import {
    canManagePlacedTowers,
    isBetweenWaves,
    isCombatActive,
} from './gamePhase';
import type { TowerTargetingMode } from '../combat/towerTargeting';
import type { TowerDefinitionId } from '../config/towerCatalog';
import { rollTowerDraftChoices } from '../config/towerDraft';
import type { TowerRace } from './towers/types';
import { getTowerDefinition } from '../config/towerCatalog';
import { getTowerRecruitCost } from '../config/towerRecruitCost';
import { raceDraftMultiplier } from '../config/raceDraftWeights';
import {
    isEnemyNexusDefeated,
    isPlayerNexusDefeated,
    isWaveRoundComplete,
} from '../combat/roundOutcome';
import { PlayerNexusSystem } from '../systems/PlayerNexusSystem';
import { TowerRaceBonusSystem } from '../systems/TowerRaceBonusSystem';
import { UnitAttackSystem } from '../systems/UnitAttackSystem';
import { UnitMovementSystem } from '../systems/UnitMovementSystem';
import { UnitNexusAttackSystem } from '../systems/UnitNexusAttackSystem';
import { formatWaveTowerDamageLog, TowerRoundDamageLog } from './TowerRoundDamageLog';
import type { TowerPairLink } from '../combat/towerPairLinks';
import {
    findTowerFusionGroups,
    getTowerFusionPreviewLinks,
    pickFusionAnchor,
} from '../combat/towerFusion';

export class GameSession
{
    readonly state: GameState;
    readonly clock: GameClock;
    readonly collision: CollisionSystem;
    readonly waves: WaveSystem;
    readonly waveSpawns: WaveSpawnSystem;
    readonly enemies: EnemySpawnSystem;
    readonly towers: TowerPlacementSystem;
    readonly unitMovement: UnitMovementSystem;
    readonly unitAttacks: UnitAttackSystem;
    readonly towerUpgrades: TowerUpgradeService;
    readonly playerNexus: PlayerNexusSystem;
    readonly deployment: DeploymentPhase;
    readonly raceBonuses: TowerRaceBonusSystem;
    readonly towerRoundDamageLog: TowerRoundDamageLog;

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
        this.towerRoundDamageLog = new TowerRoundDamageLog();
        this.towerRoundDamageLog.bindEventBus();
        this.playerNexus = new PlayerNexusSystem();
        this.deployment = new DeploymentPhase();
        this.raceBonuses = new TowerRaceBonusSystem(this.towers, grid);
        this.unitMovement = new UnitMovementSystem(
            this.enemies,
            this.towers,
            this.playerNexus,
            grid,
            this.collision,
        );
        const killRewards = new KillRewardSystem(
            this.state,
            this.towers,
            () => this.state.wave,
        );

        this.unitAttacks = new UnitAttackSystem(
            this.towers,
            this.enemies,
            this.playerNexus,
            grid,
            killRewards,
        );
        const unitNexusAttacks = new UnitNexusAttackSystem(
            this.enemies,
            this.towers,
            this.playerNexus,
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
            this.unitMovement,
            this.unitAttacks,
            this.deployment,
        );

        this.tickPipeline = [
            this.waveSpawns,
            this.unitMovement,
            this.raceBonuses,
            this.unitAttacks,
            unitNexusAttacks,
        ];
    }

    prepare (): void
    {
        this.towerUpgrades.reset();
        this.towerRoundDamageLog.reset();
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
        this.state.setRaceDraftBias(this.computeRaceDraftBias());
        this.clock.reset();
        this.raceBonuses.recalculate();
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

        return this.deployment.active;
    }

    /** Simulation ticks run only during an active combat round. */
    isRoundActive (): boolean
    {
        return isCombatActive(this.state);
    }

    get isPaused (): boolean
    {
        return this.state.paused;
    }

    togglePause (): void
    {
        if (!this.isRoundActive())
        {
            return;
        }

        this.state.setPaused(!this.state.paused);
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

        const recruitCost = getTowerRecruitCost(definitionId, this.state.wave);

        if (recruitCost > 0 && !this.state.spendGold(recruitCost))
        {
            return false;
        }

        this.state.setTowerDraftPick(null);
        this.towers.snapAllToSpawnTiles();
        this.unitMovement.clearAll();
        this.deployment.enqueue(definitionId);
        this.state.setCanStartWave(true);
        this.raceBonuses.recalculate();
        this.syncDeploymentState();
        this.state.setRaceDraftBias(this.computeRaceDraftBias());

        return true;
    }

    /** Decline recruitment between waves and continue without buying a unit. */
    skipTowerDraft (): boolean
    {
        if (!this.state.towerDraftPick)
        {
            return false;
        }

        if (this.state.wave < 1)
        {
            return false;
        }

        this.state.setTowerDraftPick(null);
        this.state.setCanStartWave(true);

        return true;
    }

    canRepositionTowers (): boolean
    {
        return canManagePlacedTowers(
            this.state.snapshot(),
            this.enemies.livingCombatCount,
            this.deployment.active,
        );
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

        this.unitMovement.clearTower(towerId);
        this.unitAttacks.clearTower(towerId);
        this.raceBonuses.recalculate();
        this.state.setRaceDraftBias(this.computeRaceDraftBias());

        return true;
    }

    tryDeployTowerAt (tile: GridPosition, towerId: TowerDefinitionId): boolean
    {
        if (!this.canPlaceQueuedTowers())
        {
            return false;
        }

        if (!this.deployment.snapshot().queue.includes(towerId))
        {
            return false;
        }

        if (!this.towers.tryPlace(tile, towerId))
        {
            return false;
        }

        this.deployment.takeById(towerId);
        this.syncDeploymentState();
        this.state.setCanStartWave(true);
        this.raceBonuses.recalculate();
        this.state.setRaceDraftBias(this.computeRaceDraftBias());
        this.waveRounds.showUpcomingWavePreview();

        return true;
    }

    canSellTower (towerId: string): boolean
    {
        if (!this.canRepositionTowers())
        {
            return false;
        }

        return this.towers.all.some((tower) => tower.id === towerId);
    }

    sellTower (towerId: string): boolean
    {
        if (!this.canSellTower(towerId))
        {
            return false;
        }

        const tower = this.towers.all.find((t) => t.id === towerId);

        if (!tower)
        {
            return false;
        }

        const refund = tower.goldValue;

        this.unitMovement.clearTower(towerId);
        this.unitAttacks.clearTower(towerId);
        this.towers.remove(towerId);
        this.state.addGold(refund);
        this.raceBonuses.recalculate();
        this.state.setRaceDraftBias(this.computeRaceDraftBias());

        return true;
    }

    getPendingTowerFusionLinks (): TowerPairLink[]
    {
        if (
            this.isRoundActive()
            || this.state.upgradePick
            || this.state.towerDraftPick
        )
        {
            return [];
        }

        return getTowerFusionPreviewLinks(this.towers.all);
    }

    resolveTowerFusion (): void
    {
        const groups = findTowerFusionGroups(this.towers.all);

        if (groups.length === 0)
        {
            return;
        }

        for (const group of groups)
        {
            const anchor = pickFusionAnchor(group);
            const victims = group.filter((tower) => tower.id !== anchor.id);

            for (const victim of victims)
            {
                this.unitMovement.clearTower(victim.id);
                this.unitAttacks.clearTower(victim.id);
            }

            this.towers.mergeFusionGroup(anchor, victims, group.length);
        }

        this.raceBonuses.recalculate();
        this.state.setRaceDraftBias(this.computeRaceDraftBias());
    }

    startWave (): void
    {
        this.state.setPaused(false);
        this.resolveTowerFusion();

        if (this.waveRounds.startCombatRound())
        {
            this.towerRoundDamageLog.beginWave(this.state.wave);
        }
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
        return this.towerUpgrades.equipCatalogUpgrade(
            this.state,
            this.towers.all,
            towerId,
            upgradeId,
            this.enemies.livingCombatCount,
        );
    }

    setTowerTargetingMode (towerId: string, mode: TowerTargetingMode): boolean
    {
        const tower = this.towers.all.find((t) => t.id === towerId);

        if (!tower)
        {
            return false;
        }

        tower.setTargetingMode(mode);
        EventBus.emit(GAME_EVENTS.TOWER_UPDATED, tower.snapshot());

        return true;
    }

    isBetweenWaves (): boolean
    {
        return isBetweenWaves(this.state, this.enemies.livingCombatCount);
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
            this.finishVictory();

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
        const damageLog = this.towerRoundDamageLog.finalizeWave(this.towers.all);

        this.state.setPaused(false);
        this.resetPlayerTowersAfterWave();
        this.awardWaveBonusExperience(damageLog.wave);

        if (damageLog.entries.length > 0)
        {
            console.info(formatWaveTowerDamageLog(damageLog));
            EventBus.emit(GAME_EVENTS.WAVE_TOWER_DAMAGE_LOG, damageLog);
        }

        this.towerUpgrades.offerPostWaveDraft(this.state);
        this.towerUpgrades.publishInventorySnapshot();

        if (!this.state.upgradePick)
        {
            this.beginPostWaveTowerDraft();
        }
    }

    private finishVictory (): void
    {
        const damageLog = this.towerRoundDamageLog.finalizeWave(this.towers.all);

        this.state.setUpgradePick(null);
        this.state.setTowerDraftPick(null);
        this.state.setCanStartWave(false);
        this.state.setPaused(true);
        this.resetPlayerTowersAfterWave();
        this.awardWaveBonusExperience(damageLog.wave);
        this.state.setRunOutcome('victory');
        EventBus.emit(GAME_EVENTS.GAME_VICTORY, {
            wave: damageLog.wave,
            lives: this.state.lives,
        });
    }

    /** After wave 1+, draft one extra tower to place before the next wave. */
    private beginPostWaveTowerDraft (): void
    {
        if (this.state.wave < 1 || this.state.towerDraftPick)
        {
            return;
        }

        this.state.setTowerDraftPick({
            choices: rollTowerDraftChoices(this.state.wave, 5, this.ownedRaceCounts()),
        });
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
        this.towerRoundDamageLog.reset();
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

    private awardWaveBonusExperience (wave: number): void
    {
        const bonus = this.towerRoundDamageLog.getWaveBonusExperience(wave);

        if (bonus <= 0)
        {
            return;
        }

        for (const tower of this.towers.all)
        {
            tower.grantExperience(bonus);
            EventBus.emit(GAME_EVENTS.TOWER_UPDATED, tower.snapshot());
        }
    }

    private resetPlayerTowersAfterWave (): void
    {
        this.towers.resetPlayerTowers();
        this.unitMovement.clearAll();
        this.unitAttacks.clearAll();
        this.raceBonuses.recalculate();
        this.state.setRaceDraftBias(this.computeRaceDraftBias());
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

    private ownedRaceCounts (): Partial<Record<TowerRace, number>>
    {
        const counts: Partial<Record<TowerRace, number>> = {};
        const bump = (race: TowerRace) =>
        {
            counts[race] = (counts[race] ?? 0) + 1;
        };

        for (const tower of this.towers.all)
        {
            bump(tower.race);
        }

        const queued = this.deployment.snapshot().queue;

        for (const towerId of queued)
        {
            const race = getTowerDefinition(towerId)?.profile.race;

            if (race)
            {
                bump(race);
            }
        }

        return counts;
    }

    private computeRaceDraftBias (): Record<TowerRace, number>
    {
        const owned = this.ownedRaceCounts();

        return {
            'aether-dominion': raceDraftMultiplier('aether-dominion', owned['aether-dominion'] ?? 0),
            'swarmforge-brood': raceDraftMultiplier('swarmforge-brood', owned['swarmforge-brood'] ?? 0),
            'iron-covenant': raceDraftMultiplier('iron-covenant', owned['iron-covenant'] ?? 0),
        };
    }
}
