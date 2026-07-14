import {
    getCardGameEnemyDefinitionOrThrow,
    type LoadedCardGameEnemyDefinition,
} from '../config/enemyCatalog';
import type { EnemyCombatant, EnemyState } from './types';

export const createEnemyCombatant = (
    instanceId: string,
    definitionId: string,
): EnemyCombatant =>
{
    const definition = getCardGameEnemyDefinitionOrThrow(definitionId);

    return {
        instanceId,
        definitionId,
        definition,
        state: createEnemyState(definition),
        queuedTurn: null,
        turnsTaken: 0,
        enrageStacks: 0,
    };
};

export const createEnemyState = (
    definition: LoadedCardGameEnemyDefinition,
): EnemyState => ({
    health: definition.maxHealth,
    maxHealth: definition.maxHealth,
    shield: 0,
    poison: 0,
});

export const isCombatantAlive = (combatant: EnemyCombatant): boolean =>
    combatant.state.health > 0;

export const normalizeEnemyIds = (enemyIds: string | readonly string[]): string[] =>
    typeof enemyIds === 'string' ? [ enemyIds ] : [ ...enemyIds ];
