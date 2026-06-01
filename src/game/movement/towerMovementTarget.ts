import { edgeToEdgeDistance, isWithinAttackRange } from '../combat/combatRange';
import type { EnemyState } from '../domain/EnemyState';
import type { TowerState } from '../domain/TowerState';

/**
 * Enemy to walk toward this tick.
 * - Hold position when any enemy is already in attack range.
 * - Otherwise advance on the nearest living threat (no short leash).
 */
export const pickTowerMovementTarget = (
    tower: TowerState,
    enemies: readonly EnemyState[],
    rangePx: number,
): EnemyState | null =>
{
    const living = enemies.filter((enemy) => enemy.health > 0 && !enemy.isPreview);

    if (living.length === 0)
    {
        return null;
    }

    const anyoneInRange = living.some((enemy) => isWithinAttackRange(tower, enemy, rangePx));

    if (anyoneInRange)
    {
        return null;
    }

    let closest: EnemyState | null = null;
    let closestEdge = Infinity;

    for (const enemy of living)
    {
        const gap = edgeToEdgeDistance(tower, enemy);

        if (gap < closestEdge)
        {
            closest = enemy;
            closestEdge = gap;
        }
    }

    return closest;
};
