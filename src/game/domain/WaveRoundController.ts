import type { GameClock } from '../systems/GameClock';
import type { EnemySpawnSystem } from '../systems/EnemySpawnSystem';
import type { TowerPlacementSystem } from '../systems/TowerPlacementSystem';
import type { WaveSpawnSystem } from '../systems/WaveSpawnSystem';
import type { WaveSystem } from '../systems/WaveSystem';
import { hasWaveDefinition } from '../config/waveCatalog';
import type { DeploymentPhase } from './DeploymentPhase';
import type { GameState } from './GameState';

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
        private readonly deployment: DeploymentPhase,
    ) {}

    static isCombatActive (state: GameState): boolean
    {
        if (state.wave === 0 || state.upgradePick || state.towerDraftPick || state.canStartWave)
        {
            return false;
        }

        return true;
    }

    showUpcomingWavePreview (): void
    {
        if (this.state.upgradePick || this.state.towerDraftPick)
        {
            return;
        }

        const nextWave = this.state.wave + 1;

        if (!hasWaveDefinition(nextWave))
        {
            return;
        }

        const mayPreview = this.deployment.active || this.state.canStartWave;

        if (!mayPreview)
        {
            return;
        }

        this.enemies.clearAll();
        this.enemies.spawnWavePreview(nextWave);
    }

    startCombatRound (): boolean
    {
        if (
            !this.state.canStartWave
            || this.state.upgradePick
            || this.state.towerDraftPick
        )
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
}
