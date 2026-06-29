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
import { WaveRoundController } from './WaveRoundController';
import { canPlaceTowers, isCombatActive } from './gamePhase';
import { UnitAttackSystem } from '../systems/UnitAttackSystem';
import { UnitMovementSystem } from '../systems/UnitMovementSystem';
import { PlayerNexusSystem } from '../systems/PlayerNexusSystem';
import { hasWaveDefinition } from '../config/waveCatalog';
import { isWaveRoundComplete } from '../combat/roundOutcome';
import { GRID_CONFIG } from '../config/gridConfig';

const TOWER_PLACE_COST = 30;
const DEFAULT_TOWER_ID = 'militia' as const;

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
    readonly playerNexus: PlayerNexusSystem;

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
        this.playerNexus = new PlayerNexusSystem();
        this.unitMovement = new UnitMovementSystem(
            this.enemies,
            this.towers,
            grid,
            this.collision,
        );
        const killRewards = new KillRewardSystem(this.state, this.towers);

        this.unitAttacks = new UnitAttackSystem(
            this.towers,
            this.enemies,
            this.playerNexus,
            grid,
            killRewards,
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
        );

        this.tickPipeline = [
            this.waveSpawns,
            this.unitMovement,
            this.unitAttacks,
        ];
    }

    prepare (): void
    {
        this.enemies.clearAll();
        this.towers.clearAll();
        this.waveSpawns.clear();
        this.unitMovement.clearAll();
        this.unitAttacks.clearAll();
        this.state.setGold(100);
        this.state.setLives(10);
        this.state.setWave(0);
        this.state.setRunOutcome('playing');
        this.state.setPaused(false);
        this.state.setCanStartWave(true);
        this.clock.reset();
        this.waveRounds.showUpcomingWavePreview();
    }

    isRoundActive (): boolean
    {
        return isCombatActive(this.state.snapshot());
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

    canPlaceTowers (): boolean
    {
        return canPlaceTowers(this.state.snapshot());
    }

    tryPlaceTower (tile: GridPosition): boolean
    {
        if (!this.canPlaceTowers())
        {
            return false;
        }

        if (!this.state.spendGold(TOWER_PLACE_COST))
        {
            return false;
        }

        if (!this.towers.tryPlace(tile, DEFAULT_TOWER_ID))
        {
            this.state.addGold(TOWER_PLACE_COST);
            return false;
        }

        return true;
    }

    startWave (): void
    {
        this.state.setPaused(false);
        this.waveRounds.startCombatRound();
    }

    checkWaveComplete (): void
    {
        if (!this.isRoundActive())
        {
            return;
        }

        if (this.state.lives <= 0)
        {
            this.finishWave(false);
            return;
        }

        if (
            isWaveRoundComplete(
                this.enemies.all,
                this.waveSpawns.hasPendingSpawns,
            )
        )
        {
            const wonRun = !hasWaveDefinition(this.state.wave + 1);
            this.finishWave(wonRun);
        }
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

        this.processLeaks();
        this.checkWaveComplete();
    }

    reset (): void
    {
        this.clock.reset();
        this.collision.clear();
        this.waveSpawns.clear();
        this.playerNexus.reset();
    }

    private processLeaks (): void
    {
        const leakRow = GRID_CONFIG.rows - 1;

        for (const enemy of this.enemies.combatants)
        {
            const tile = this.unitMovement.tileAt(enemy.position);

            if (!tile || tile.row < leakRow)
            {
                continue;
            }

            this.enemies.remove(enemy.id);
            this.state.setLives(this.state.lives - 1);

            if (this.state.lives <= 0)
            {
                this.state.setRunOutcome('defeat');
            }
        }
    }

    private finishWave (wonRun: boolean): void
    {
        this.waveSpawns.clear();
        this.enemies.clearAll();
        this.unitMovement.clearAll();
        this.unitAttacks.clearAll();
        this.state.setPaused(false);

        if (wonRun)
        {
            this.state.setRunOutcome('victory');
            this.state.setCanStartWave(false);
            EventBus.emit(GAME_EVENTS.GAME_VICTORY, {
                wave: this.state.wave,
                lives: this.state.lives,
            });
            return;
        }

        if (this.state.runOutcome === 'defeat')
        {
            this.state.setCanStartWave(false);
            return;
        }

        this.state.setCanStartWave(true);
        this.waveRounds.showUpcomingWavePreview();
        EventBus.emit(GAME_EVENTS.WAVE_COMPLETED);
    }
}
