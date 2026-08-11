import { getCardGameEnemyDefinitionOrThrow, type LoadedCardGameEnemyDefinition } from '../config/enemyCatalog';
import { initializeEnemyHitMitigation } from '../combat/combatTraits/mitigation';
import type { EnemyCombatant, EnemyState } from './types';

export const createEnemyState = (
    definition: LoadedCardGameEnemyDefinition,
    healthMultiplier = 1,
): EnemyState =>
{
    const maxHealth = Math.max(1, Math.round(definition.maxHealth * healthMultiplier));

    return {
        health: maxHealth,
        maxHealth,
        shield: 0,
        poison: 0,
    };
};

export const createEnemyCombatant = (
    instanceId: string,
    definitionId: string,
    healthMultiplier = 1,
): EnemyCombatant =>
{
    const definition = getCardGameEnemyDefinitionOrThrow(definitionId);
    const combatant: EnemyCombatant = {
        instanceId,
        definitionId,
        definition,
        state: createEnemyState(definition, healthMultiplier),
        queuedTurn: null,
        turnsTaken: 0,
        enrageStacks: 0,
        phaseShiftActive: false,
    };

    initializeEnemyHitMitigation(combatant);

    return combatant;
};

export const isCombatantAlive = (combatant: EnemyCombatant): boolean =>
    combatant.state.health > 0;

export const normalizeEnemyIds = (enemyIds: string | readonly string[]): string[] =>
    typeof enemyIds === 'string' ? [ enemyIds ] : [ ...enemyIds ];
