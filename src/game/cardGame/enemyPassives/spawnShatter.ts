import { MAX_ENEMY_COLUMN_SLOTS } from '../../board/enemySquadLayout';
import type { EnemyCombatant } from '../domain/types';
import { isCombatantAlive } from '../domain/enemyCombatants';
import { getEnemyPassive } from './defaults';
import type { SpawnMinionPassiveConfig } from './types';

const livingCount = (combatants: readonly EnemyCombatant[]): number =>
    combatants.filter(isCombatantAlive).length;

/** Returns spawn config when the host should deploy a minion after its turn. */
export const shouldSpawnMinionAfterTurn = (
    host: EnemyCombatant,
    combatants: readonly EnemyCombatant[],
): SpawnMinionPassiveConfig | null =>
{
    const passive = getEnemyPassive(host.definition.passives, 'spawnMinion');

    if (!passive || !isCombatantAlive(host))
    {
        return null;
    }

    const livingMinions = combatants.filter(
        (combatant) => isCombatantAlive(combatant) && combatant.definitionId === passive.minionId,
    ).length;

    if (livingMinions >= passive.maxLivingMinions || livingCount(combatants) >= MAX_ENEMY_COLUMN_SLOTS)
    {
        return null;
    }

    const onCadence = passive.everyTurns > 0
        && host.turnsTaken > 0
        && host.turnsTaken % passive.everyTurns === 0;
    const atThreshold = passive.healthRatio !== undefined
        && host.state.maxHealth > 0
        && host.state.health / host.state.maxHealth <= passive.healthRatio
        && livingMinions === 0;

    return onCadence || atThreshold ? passive : null;
};

/** Part definition ids that fit in the remaining squad slots (excluding the dying host). */
export const shatterPartsThatFit = (
    combatant: EnemyCombatant,
    livingOthers: number,
): string[] =>
{
    const passive = getEnemyPassive(combatant.definition.passives, 'shatterOnDeath');

    if (!passive?.parts.length)
    {
        return [];
    }

    return passive.parts.slice(0, Math.max(0, MAX_ENEMY_COLUMN_SLOTS - livingOthers));
};
