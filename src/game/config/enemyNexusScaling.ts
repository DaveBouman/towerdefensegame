export { ENEMY_NEXUS_RANGE_TILES } from './nexusCombatScaling';

/**
 * Enemy nexus is the run's final boss — its damage is much higher than the player nexus.
 * Scales with wave so late-game assaults stay threatening.
 */
const ENEMY_NEXUS_BASE_DAMAGE = 50;
const ENEMY_NEXUS_DAMAGE_PER_WAVE = 14;
const ENEMY_NEXUS_LATE_WAVE_THRESHOLD = 6;
const ENEMY_NEXUS_EXTRA_DAMAGE_PER_WAVE_AFTER = 22;

export const getEnemyNexusDamageForWave = (wave: number): number =>
{
    const w = Math.max(1, wave);

    if (w <= ENEMY_NEXUS_LATE_WAVE_THRESHOLD)
    {
        return ENEMY_NEXUS_BASE_DAMAGE + (w - 1) * ENEMY_NEXUS_DAMAGE_PER_WAVE;
    }

    const earlyBlock = ENEMY_NEXUS_BASE_DAMAGE
        + (ENEMY_NEXUS_LATE_WAVE_THRESHOLD - 1) * ENEMY_NEXUS_DAMAGE_PER_WAVE;

    return earlyBlock + (w - ENEMY_NEXUS_LATE_WAVE_THRESHOLD) * ENEMY_NEXUS_EXTRA_DAMAGE_PER_WAVE_AFTER;
};
