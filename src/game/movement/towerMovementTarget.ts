import { isWithinAttackRange } from '../combat/combatRange';
import { pickTowerPriorityTarget } from '../combat/towerTargeting';
import type { EnemyState } from '../domain/EnemyState';
import type { TowerState } from '../domain/TowerState';

/**
 * Enemy to walk toward this tick.
 * - Hold position when the preferred target (by targeting mode) is in range.
 * - Otherwise advance on that target so the tower can shoot it.
 */
export const pickTowerMovementTarget = (
    tower: TowerState,
    enemies: readonly EnemyState[],
    rangePx: number,
): EnemyState | null =>
{
    const priority = pickTowerPriorityTarget(tower.targetingMode, tower, enemies);

    if (!priority)
    {
        return null;
    }

    if (isWithinAttackRange(tower, priority, rangePx))
    {
        return null;
    }

    return priority;
};
