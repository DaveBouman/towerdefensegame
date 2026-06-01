import type { EnemyState } from '../domain/EnemyState';
import type { TowerState } from '../domain/TowerState';

/** Wave minions only — excludes the enemy nexus. */
export const livingMinions = (enemies: readonly EnemyState[]): EnemyState[] =>
    enemies.filter((enemy) => !enemy.isPreview && !enemy.isNexus && enemy.health > 0);

export const livingTowers = (towers: readonly TowerState[]): TowerState[] =>
    towers.filter((tower) => tower.health > 0);

/**
 * Towers may only shoot the enemy nexus when no other enemies are on the field.
 */
export const enemiesAttackableByTowers = (enemies: readonly EnemyState[]): EnemyState[] =>
{
    const minions = livingMinions(enemies);

    if (minions.length > 0)
    {
        return minions;
    }

    const nexus = enemies.find(
        (enemy) => enemy.isNexus && !enemy.isPreview && enemy.health > 0,
    );

    return nexus ? [ nexus ] : [];
};

/** Enemies may only strike the player nexus when no player towers remain. */
export const canEnemiesTargetPlayerNexus = (towers: readonly TowerState[]): boolean =>
    livingTowers(towers).length === 0;

/** Player nexus may only strike the enemy nexus when no wave minions remain. */
export const canPlayerNexusTargetEnemyNexus = (enemies: readonly EnemyState[]): boolean =>
    livingMinions(enemies).length === 0;

