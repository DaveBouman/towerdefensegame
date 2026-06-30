import { GAME_RULES } from './cardRegistry';
import enemiesData from './enemies.json';

export interface CardGameEnemyDefinition {
    id: string;
    label: string;
    maxHealth: number;
    attackDamage: number;
    shieldGain: number;
    /** Chance to attack instead of shielding on each turn (0–1). */
    attackChance: number;
    /** Traps placed on the board every enemy turn. */
    hazardsPerTurn: number;
}

const definitions = new Map<string, CardGameEnemyDefinition>(
    enemiesData.enemies.map((enemy) => [ enemy.id, enemy ]),
);

export const CARD_GAME_ENEMY_DEFINITIONS: readonly CardGameEnemyDefinition[] = enemiesData.enemies;

export const getCardGameEnemyDefinition = (id: string): CardGameEnemyDefinition | undefined =>
    definitions.get(id);

export const getCardGameEnemyDefinitionOrThrow = (id: string): CardGameEnemyDefinition =>
{
    const definition = getCardGameEnemyDefinition(id);

    if (!definition)
    {
        throw new Error(`Unknown card-game enemy: ${id}`);
    }

    return definition;
};

export const getDefaultCardGameEnemy = (): CardGameEnemyDefinition =>
    getCardGameEnemyDefinitionOrThrow(GAME_RULES.defaultEnemyId);
