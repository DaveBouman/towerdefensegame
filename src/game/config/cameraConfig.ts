import { BASIC_ENEMY_BASE_STATS } from './basicEnemyStats';
import { TICKS_PER_SECOND } from './gameClockConfig';
import { TOWER_MOVE_SPEED_PER_TICK } from './towerProfiles';

/** Largest catalog bonus to tower move speed (Boots of Speed). */
const MAX_TOWER_MOVE_BONUS_PER_TICK = 4;

/**
 * Fastest units on the field in world pixels per second
 * (moveSpeedPerTick × simulation tick rate).
 */
export const maxUnitMovePixelsPerSecond = (): number =>
{
    const maxPerTick = Math.max(
        BASIC_ENEMY_BASE_STATS.moveSpeedPerTick,
        TOWER_MOVE_SPEED_PER_TICK + MAX_TOWER_MOVE_BONUS_PER_TICK,
    );

    return maxPerTick * TICKS_PER_SECOND;
};

/** Camera pans quicker than any unit can walk (see maxUnitMovePixelsPerSecond). */
export const CAMERA_PAN_SPEED_MULTIPLIER = 6;

export const CAMERA_PAN_PX_PER_SEC =
    maxUnitMovePixelsPerSecond() * CAMERA_PAN_SPEED_MULTIPLIER;
