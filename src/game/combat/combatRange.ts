import type { WorldPosition } from '../grid/types';
import { worldDistance } from '../grid/worldPosition';

export interface CombatEntity
{
    position: WorldPosition;
    bodyHalfWidth: number;
    bodyHalfHeight: number;
}

const bodyRadius = (halfWidth: number, halfHeight: number): number =>
    Math.max(halfWidth, halfHeight);

/** Gap between unit hitboxes — range stats are measured against this distance. */
export const edgeToEdgeDistance = (a: CombatEntity, b: CombatEntity): number =>
{
    const centerDistance = worldDistance(a.position, b.position);
    const reach = bodyRadius(a.bodyHalfWidth, a.bodyHalfHeight)
        + bodyRadius(b.bodyHalfWidth, b.bodyHalfHeight);

    return Math.max(0, centerDistance - reach);
};

export const isWithinAttackRange = (
    attacker: CombatEntity,
    target: CombatEntity,
    rangePx: number,
): boolean => edgeToEdgeDistance(attacker, target) <= rangePx;

/**
 * Center-to-center radius for a range ring that matches edge-to-edge combat reach.
 * The ring edge is where a target's hitbox can sit at maximum attack range.
 */
export const rangeIndicatorRadiusPx = (
    rangePx: number,
    attackerBodyHalfWidth: number,
    attackerBodyHalfHeight: number,
    targetBodyHalfWidth: number,
    targetBodyHalfHeight: number,
): number =>
    rangePx
    + bodyRadius(attackerBodyHalfWidth, attackerBodyHalfHeight)
    + bodyRadius(targetBodyHalfWidth, targetBodyHalfHeight);
