import type { EnemyState } from '../domain/EnemyState';
import { livingMinions } from './targetPriority';

export const isWaveRoundComplete = (
    enemies: readonly EnemyState[],
    hasPendingSpawns: boolean,
): boolean =>
    livingMinions(enemies).length === 0 && !hasPendingSpawns;
