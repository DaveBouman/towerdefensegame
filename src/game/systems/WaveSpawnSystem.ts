import type { WaveSpawnEntry } from '../config/waveCatalog';
import { getWaveDefinition } from '../config/waveCatalog';
import type { TickSystem } from '../domain/TickSystem';
import type { EnemySpawnSystem } from './EnemySpawnSystem';

interface QueuedSpawn extends WaveSpawnEntry {}

export class WaveSpawnSystem implements TickSystem
{
    private queue: QueuedSpawn[] = [];
    private waveStartTick: number | null = null;

    constructor (private readonly enemies: EnemySpawnSystem) {}

    get hasPendingSpawns (): boolean
    {
        return this.queue.length > 0;
    }

    /** Starts (or restarts) combat spawns for a wave — always runs, never skipped. */
    beginCombatWave (wave: number, gameTick: number): void
    {
        const definition = getWaveDefinition(wave);

        this.queue = [ ...definition.spawns ].sort((a, b) => a.delayTicks - b.delayTicks);
        this.waveStartTick = gameTick;
        this.processDue(gameTick);
    }

    tick (gameTick: number): void
    {
        this.processDue(gameTick);
    }

    clear (): void
    {
        this.queue = [];
        this.waveStartTick = null;
    }

    private processDue (gameTick: number): void
    {
        if (this.waveStartTick === null)
        {
            return;
        }

        const elapsed = gameTick - this.waveStartTick;

        while (this.queue.length > 0 && this.queue[0].delayTicks <= elapsed)
        {
            const entry = this.queue.shift()!;

            if (!this.spawnEntry(entry))
            {
                this.queue.push(entry);
                break;
            }
        }
    }

    private spawnEntry (entry: WaveSpawnEntry): boolean
    {
        return this.enemies.trySpawnAt(entry.tile, entry.kind) !== null;
    }
}
