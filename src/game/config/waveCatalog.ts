import type { GridPosition } from '../grid/types';
import wavesJson from './waves.json';

export type WaveEnemyKind = 'basic';

export interface WaveSpawnEntry {
    kind: WaveEnemyKind;
    tile: GridPosition;
    /** Simulation ticks after the wave begins. */
    delayTicks: number;
}

export interface WaveDefinition {
    spawns: readonly WaveSpawnEntry[];
}

interface WaveSpawnJson {
    kind: string;
    col: number;
    row: number;
    delayTicks: number;
}

interface WaveJson {
    wave: number;
    spawns: WaveSpawnJson[];
}

interface WavesFile {
    waves: WaveJson[];
}

const parseWaveFile = (file: WavesFile): Readonly<Record<number, WaveDefinition>> =>
{
    const catalog: Record<number, WaveDefinition> = {};

    for (const entry of file.waves)
    {
        catalog[entry.wave] = {
            spawns: entry.spawns.map((spawn) => ({
                kind: spawn.kind as WaveEnemyKind,
                tile: { col: spawn.col, row: spawn.row },
                delayTicks: spawn.delayTicks,
            })),
        };
    }

    return catalog;
};

const waveCatalog = parseWaveFile(wavesJson as WavesFile);

export const WAVE_COUNT = wavesJson.waves.length;

export const getWaveDefinition = (wave: number): WaveDefinition =>
{
    const definition = waveCatalog[wave];

    if (!definition)
    {
        throw new Error(`Wave ${wave} is not defined in waves.json`);
    }

    return definition;
};

export const hasWaveDefinition = (wave: number): boolean =>
    wave >= 1 && wave <= WAVE_COUNT;
