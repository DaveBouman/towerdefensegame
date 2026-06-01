import type { CombatEntity } from './combatRange';
import { isWithinAttackRange } from './combatRange';
import type { EnemyState } from '../domain/EnemyState';
import type { TowerState } from '../domain/TowerState';
import { worldDistance } from '../grid/worldPosition';

export type TowerTargetingMode =
    | 'nearest'
    | 'weakest'
    | 'highestHealth'
    | 'highestDamage';

export const TOWER_TARGETING_MODES: readonly TowerTargetingMode[] = [
    'nearest',
    'weakest',
    'highestHealth',
    'highestDamage',
];

export const towerTargetingLabels: Record<TowerTargetingMode, string> = {
    nearest: 'Nearest',
    weakest: 'Weakest',
    highestHealth: 'Most HP',
    highestDamage: 'Most damage',
};

const distanceBetween = (a: CombatEntity, b: CombatEntity): number =>
    worldDistance(a.position, b.position);

/** Enemies the tower is allowed to shoot this tick (in range, not preview). */
export const enemiesInTowerRange = (
    tower: TowerState,
    enemies: readonly EnemyState[],
    rangePx: number,
): EnemyState[] =>
    enemies.filter(
        (enemy) => !enemy.isPreview && isWithinAttackRange(tower, enemy, rangePx),
    );

/**
 * Picks an attack target by player priority among in-range enemies only.
 * Tie-break: closer to the tower (fairer focus fire).
 */
export const pickTowerAttackTarget = (
    mode: TowerTargetingMode,
    tower: TowerState,
    enemies: readonly EnemyState[],
    rangePx: number,
): EnemyState | null =>
{
    const inRange = enemiesInTowerRange(tower, enemies, rangePx);

    if (inRange.length === 0)
    {
        return null;
    }

    const byNearest = (a: EnemyState, b: EnemyState): number =>
        distanceBetween(tower, a) - distanceBetween(tower, b);

    const sorted = [ ...inRange ];

    switch (mode)
    {
        case 'nearest':
            sorted.sort(byNearest);
            break;
        case 'weakest':
            sorted.sort((a, b) => a.health - b.health || byNearest(a, b));
            break;
        case 'highestHealth':
            sorted.sort((a, b) => b.maxHealth - a.maxHealth || byNearest(a, b));
            break;
        case 'highestDamage':
            sorted.sort(
                (a, b) => b.stats.attackDamage - a.stats.attackDamage || byNearest(a, b),
            );
            break;
    }

    return sorted[0] ?? null;
};
