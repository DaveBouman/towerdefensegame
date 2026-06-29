import type { GameState } from './GameState';
import type { GameClock } from '../systems/GameClock';
import type { EnemySpawnSystem } from '../systems/EnemySpawnSystem';
import type { TowerPlacementSystem } from '../systems/TowerPlacementSystem';
import type { WaveSpawnSystem } from '../systems/WaveSpawnSystem';
import type { WaveSystem } from '../systems/WaveSystem';
import { hasWaveDefinition } from '../config/waveCatalog';
import { isCombatActive } from './gamePhase';

interface AttackResetPort {
    clearAll (): void;
}

interface MovementResetPort {
    clearAll (): void;
}

export class WaveRoundController
{
    constructor (
        private readonly state: GameState,
        private readonly clock: GameClock,
        private readonly waves: WaveSystem,
        private readonly waveSpawns: WaveSpawnSystem,
        private readonly enemies: EnemySpawnSystem,
        private readonly towers: TowerPlacementSystem,
        private readonly unitMovement: MovementResetPort,
        private readonly unitAttacks: AttackResetPort,
    ) {}

    showUpcomingWavePreview (): void
    {
        const nextWave = this.state.wave + 1;

        if (!hasWaveDefinition(nextWave) || !this.state.canStartWave)
        {
            return;
        }

        this.enemies.clearAll();
        this.enemies.spawnWavePreview(nextWave);
    }

    startCombatRound (): boolean
    {
        if (!this.state.canStartWave)
        {
            return false;
        }

        const nextWave = this.state.wave + 1;

        if (!hasWaveDefinition(nextWave))
        {
            return false;
        }

        this.enemies.removeAllPreviews();
        this.enemies.clearAll();
        this.waveSpawns.clear();
        this.state.setCanStartWave(false);
        this.waves.startNextWave();
        this.towers.snapAllToSpawnTiles();
        this.unitMovement.clearAll();
        this.unitAttacks.clearAll();
        this.waveSpawns.beginCombatWave(this.state.wave, this.clock.currentTick);

        return true;
    }

    static isCombatActive (state: GameState): boolean
    {
        return isCombatActive(state.snapshot());
    }
}
