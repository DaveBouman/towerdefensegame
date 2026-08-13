import { random } from '../../random/rng';
import { GAME_RULES } from '../config/cardRegistry';
import { getCardGameEnemyDefinitionOrThrow, type LoadedCardGameEnemyDefinition } from '../config/enemyCatalog';
import { initializeEnemyHitMitigation } from '../combat/combatTraits/mitigation';
import type { EnemyCombatant, EnemyState } from './types';

/** Inclusive integrity band around a median given the configured variance. */
export const getEnemyHealthRange = (
    median: number,
    variance = GAME_RULES.enemyHealthVariance,
): { min: number; max: number } =>
{
    const spread = Math.max(0, variance);

    return {
        min: Math.max(1, Math.round(median * (1 - spread))),
        max: Math.max(1, Math.round(median * (1 + spread))),
    };
};

/** Seeded roll of fight HP around a median. `variance` 0.1 → ±10%. */
export const rollEnemyMaxHealth = (
    median: number,
    variance = GAME_RULES.enemyHealthVariance,
): number =>
{
    const base = Math.max(1, median);
    const spread = Math.max(0, variance);

    if (spread === 0)
    {
        return Math.max(1, Math.round(base));
    }

    const factor = 1 + (random() * 2 - 1) * spread;

    return Math.max(1, Math.round(base * factor));
};

export const createEnemyState = (
    definition: LoadedCardGameEnemyDefinition,
    healthMultiplier = 1,
): EnemyState =>
{
    const median = Math.max(1, definition.maxHealth * healthMultiplier);
    const maxHealth = rollEnemyMaxHealth(median);

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
