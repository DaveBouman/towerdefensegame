import type { CollisionSystem } from '../systems/CollisionSystem';
import type { WorldPosition } from '../grid/types';

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

/** Tries the preferred step first, then sidesteps when another body blocks the path. */
export const tryMoveWithAvoidance = (
    collision: CollisionSystem,
    unitId: string,
    from: WorldPosition,
    preferredTo: WorldPosition,
    speed: number,
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

    for (const offset of SIDESTEP_ANGLES)
    {
        const angle = baseAngle + offset;
        const candidate = {
            x: from.x + Math.cos(angle) * speed,
            y: from.y + Math.sin(angle) * speed,
        };

        if (collision.tryMove(unitId, candidate))
        {
            return candidate;
        }
    }

    return null;
};
