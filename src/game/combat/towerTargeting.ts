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

const livingEnemies = (enemies: readonly EnemyState[]): EnemyState[] =>
    enemies.filter((enemy) => !enemy.isPreview && enemy.health > 0);

const sortEnemiesByPriority = (
    mode: TowerTargetingMode,
    tower: TowerState,
    candidates: readonly EnemyState[],
): EnemyState[] =>
{
    const byNearest = (a: EnemyState, b: EnemyState): number =>
        distanceBetween(tower, a) - distanceBetween(tower, b);

    const sorted = [ ...candidates ];

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
                (a, b) => b.stats.damage - a.stats.damage || byNearest(a, b),
            );
            break;
    }

    return sorted;
};

/**
 * Preferred enemy by targeting mode (ignores range).
 * Used to decide where mobile towers should advance.
 */
export const pickTowerPriorityTarget = (
    mode: TowerTargetingMode,
    tower: TowerState,
    enemies: readonly EnemyState[],
): EnemyState | null =>
{
    const living = livingEnemies(enemies);

    return sortEnemiesByPriority(mode, tower, living)[0] ?? null;
};

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

    return sortEnemiesByPriority(mode, tower, inRange)[0] ?? null;
};
