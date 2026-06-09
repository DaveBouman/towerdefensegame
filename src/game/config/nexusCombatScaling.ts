/** Player nexus damage scaling by wave (enemy nexus uses enemyNexusScaling.ts). */
/** Nexus attack range (tiles); matches enemy-nexus in enemies.json. */
export const ENEMY_NEXUS_RANGE_TILES = 8;
export const NEXUS_RANGE_TILES = ENEMY_NEXUS_RANGE_TILES;

const EARLY_BASE_DAMAGE = 18;
const DAMAGE_PER_WAVE = 5;
const LATE_WAVE_THRESHOLD = 5;
const EXTRA_DAMAGE_PER_WAVE_AFTER_THRESHOLD = 4;

export const getNexusDamageForWave = (wave: number): number =>
{
    const w = Math.max(1, wave);

    if (w <= LATE_WAVE_THRESHOLD)
    {
        return EARLY_BASE_DAMAGE + (w - 1) * DAMAGE_PER_WAVE;
    }

    const earlyBlock = EARLY_BASE_DAMAGE + (LATE_WAVE_THRESHOLD - 1) * DAMAGE_PER_WAVE;

    return earlyBlock + (w - LATE_WAVE_THRESHOLD) * EXTRA_DAMAGE_PER_WAVE_AFTER_THRESHOLD;
};
