import type { EnemyState } from '../domain/EnemyState';
import type { PlayerNexusState } from '../domain/PlayerNexusState';
import type { TowerState } from '../domain/TowerState';
import { livingMinions, livingTowers } from './targetPriority';

/**
 * Round flow:
 * 1. Skirmish — towers vs wave minions; both nexuses can attack when rules allow.
 * 2. Minions cleared → enemy nexus assaults player towers until they are destroyed.
 * 3. All player towers gone → wave ends; enemy nexus HP carries into the next wave.
 * 4. Enemy nexus is chipped down over many waves; run ends when it reaches 0 HP.
 * 5. Player nexus at 0 HP ends the run (loss).
 */

export const isPlayerNexusDefeated = (nexus: PlayerNexusState | null): boolean =>
    !nexus || nexus.health <= 0;

export const isEnemyNexusDefeated = (enemyNexus: EnemyState | undefined): boolean =>
    !enemyNexus || enemyNexus.health <= 0;

export const isSkirmishOngoing = (
    enemies: readonly EnemyState[],
    hasPendingSpawns: boolean,
): boolean =>
    livingMinions(enemies).length > 0 || hasPendingSpawns;

export const isWaveAssaultComplete = (
    enemies: readonly EnemyState[],
    hasPendingSpawns: boolean,
): boolean => !isSkirmishOngoing(enemies, hasPendingSpawns);

/** Wave reward phase: field is clear and the enemy nexus has wiped player towers. */
export const isWaveRoundComplete = (
    enemies: readonly EnemyState[],
    towers: readonly TowerState[],
    hasPendingSpawns: boolean,
): boolean =>
    isWaveAssaultComplete(enemies, hasPendingSpawns)
    && livingTowers(towers).length === 0;
