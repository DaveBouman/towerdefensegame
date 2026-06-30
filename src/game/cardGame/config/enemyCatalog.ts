import { GAME_RULES } from './cardRegistry';
import enemiesData from './enemies.json';
import { normalizeEnemyPassives } from '../enemyPassives/defaults';
import type { EnemyPassiveConfig, EnemyPassiveInput } from '../enemyPassives/types';

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
    passives?: EnemyPassiveInput[];
}

export interface LoadedCardGameEnemyDefinition extends Omit<CardGameEnemyDefinition, 'passives'> {
    passives: EnemyPassiveConfig[];
}

const loadEnemy = (enemy: CardGameEnemyDefinition): LoadedCardGameEnemyDefinition => ({
    ...enemy,
    passives: normalizeEnemyPassives(enemy.passives),
});

const definitions = new Map<string, LoadedCardGameEnemyDefinition>(
    enemiesData.enemies.map((enemy) => [ enemy.id, loadEnemy(enemy) ]),
);

export const CARD_GAME_ENEMY_DEFINITIONS: readonly LoadedCardGameEnemyDefinition[] =
    enemiesData.enemies.map(loadEnemy);

export const getCardGameEnemyDefinition = (id: string): LoadedCardGameEnemyDefinition | undefined =>
    definitions.get(id);

export const getCardGameEnemyDefinitionOrThrow = (id: string): LoadedCardGameEnemyDefinition =>
{
    const definition = getCardGameEnemyDefinition(id);

    if (!definition)
    {
        throw new Error(`Unknown card-game enemy: ${id}`);
    }

    return definition;
};

export const getDefaultCardGameEnemy = (): LoadedCardGameEnemyDefinition =>
    getCardGameEnemyDefinitionOrThrow(GAME_RULES.defaultEnemyId);
