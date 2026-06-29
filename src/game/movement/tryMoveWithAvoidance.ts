import type { CollisionSystem, MoveOptions } from '../systems/CollisionSystem';
import type { WorldPosition } from '../grid/types';

const LATERAL_SIDESTEP_ANGLES = [ 0, Math.PI / 2, -Math.PI / 2 ];

const SIDESTEP_ANGLES = [
    0,
    Math.PI / 2,
    -Math.PI / 2,
    Math.PI / 4,
    -Math.PI / 4,
    (3 * Math.PI) / 4,
    (-3 * Math.PI) / 4,
    Math.PI,
];

/** Forward step first, then left/right only — avoids queueing without full sidestep roulette. */
export const tryLateralMove = (
    collision: CollisionSystem,
    unitId: string,
    from: WorldPosition,
    preferredTo: WorldPosition,
    speed: number,
    options: MoveOptions = {},
): WorldPosition | null =>
    tryMoveWithAngles(
        collision,
        unitId,
        from,
        preferredTo,
        speed,
        LATERAL_SIDESTEP_ANGLES,
        options,
    );

/** Tries the preferred step first, then sidesteps when another body blocks the path. */
export const tryMoveWithAvoidance = (
    collision: CollisionSystem,
    unitId: string,
    from: WorldPosition,
    preferredTo: WorldPosition,
    speed: number,
): WorldPosition | null =>
    tryMoveWithAngles(collision, unitId, from, preferredTo, speed, SIDESTEP_ANGLES);

const tryMoveWithAngles = (
    collision: CollisionSystem,
    unitId: string,
    from: WorldPosition,
    preferredTo: WorldPosition,
    speed: number,
    angles: readonly number[],
    options: MoveOptions = {},
): WorldPosition | null =>
{
    if (speed <= 0)
    {
        return null;
    }

    const dx = preferredTo.x - from.x;
    const dy = preferredTo.y - from.y;
    const baseAngle = Math.hypot(dx, dy) > 0.001
        ? Math.atan2(dy, dx)
        : 0;

    for (const offset of angles)
    {
        const angle = baseAngle + offset;
        const candidate = {
            x: from.x + Math.cos(angle) * speed,
            y: from.y + Math.sin(angle) * speed,
        };

        if (collision.tryMove(unitId, candidate, options))
        {
            return candidate;
        }
    }

    return null;
};
