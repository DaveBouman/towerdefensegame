import type { Grid } from '../grid/Grid';
import type { WorldPosition } from '../grid/types';
import { worldDistance } from '../grid/worldPosition';

const WAYPOINT_THRESHOLD = 4;

/** One step of continuous movement toward a world target (combat chase / last-mile). */
export const stepTowardWorldTarget = (
    from: WorldPosition,
    to: WorldPosition,
    maxStep: number,
): WorldPosition =>
{
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const distance = Math.hypot(dx, dy);

    if (distance === 0 || maxStep <= 0)
    {
        return { ...from };
    }

    const step = Math.min(maxStep, distance);
    const scale = step / distance;

    return {
        x: from.x + dx * scale,
        y: from.y + dy * scale,
    };
};

/**
 * Advances along tile-center waypoints using continuous motion.
 * Returns the new position and remaining path waypoints.
 */
export const followPathStep = (
    grid: Grid,
    from: WorldPosition,
    path: readonly WorldPosition[],
    speed: number,
): { position: WorldPosition; path: WorldPosition[] } | null =>
{
    if (path.length === 0 || speed <= 0)
    {
        return null;
    }

    const remaining = [ ...path ];
    let waypoint = remaining[0];
    let distanceToWaypoint = worldDistance(from, waypoint);

    while (distanceToWaypoint <= WAYPOINT_THRESHOLD && remaining.length > 0)
    {
        remaining.shift();

        if (remaining.length === 0)
        {
            return null;
        }

        waypoint = remaining[0];
        distanceToWaypoint = worldDistance(from, waypoint);
    }

    if (remaining.length === 0)
    {
        return null;
    }

    const next = stepTowardWorldTarget(from, waypoint, speed);

    return { position: next, path: remaining };
};

export const pathToWorldWaypoints = (
    grid: Grid,
    tiles: readonly { col: number; row: number }[],
): WorldPosition[] =>
    tiles.map((tile) => grid.toTileCenter(tile));
