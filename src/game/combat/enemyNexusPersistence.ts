import type { EnemyState } from '../domain/EnemyState';

/** Enemy nexus stays on the field at 0 HP until a run reset — damage carries across waves. */
export const isPersistentEnemyNexus = (enemy: EnemyState): boolean =>
    enemy.isNexus;
