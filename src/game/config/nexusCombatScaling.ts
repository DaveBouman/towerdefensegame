/**
 * Shared nexus combat scaling by wave (enemy and player nexuses).
 * Early waves are threatening but survivable; damage ramps up for later waves.
 */
export const NEXUS_RANGE_TILES = 10;

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
