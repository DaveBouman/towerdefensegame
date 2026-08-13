import { copy, enemyLabel } from '../../copy/strings';
import { GAME_RULES } from './cardRegistry';
import enemiesData from './enemies.json';
import { normalizeEnemyPassives } from '../enemyPassives/defaults';
import type { EnemyPassiveInput } from '../enemyPassives/types';
import type { EnemyAllyActionDefinition } from '../combat/enemyAllySupport';
import { normalizeCombatTraits } from '../combat/combatTraits/defaults';
import type { CombatTraitInput } from '../combat/combatTraits/types';

export interface CardGameEnemyDefinition {
    id: string;
    label: string;
    /** Median fight integrity. Actual max HP rolls ±`enemyHealthVariance`. */
    maxHealth: number;
    attackDamage: number;
    shieldGain: number;
    /** Chance to attack instead of shielding on each turn (0–1). */
    attackChance: number;
    /** Traps placed on the board every enemy turn. */
    hazardsPerTurn: number;
    passives?: EnemyPassiveInput[];
    /** Defensive combat traits shown as icons below the enemy name. */
    combatTraits?: CombatTraitInput[];
    /** Optional ally-support actions used in multi-enemy fights. */
    allyActions?: EnemyAllyActionDefinition[];
}

export interface LoadedCardGameEnemyDefinition extends Omit<CardGameEnemyDefinition, 'passives' | 'combatTraits'> {
    passives: import('../enemyPassives/types').EnemyPassiveConfig[];
    combatTraits: import('../combat/combatTraits/types').CombatTraitConfig[];
}

const loadEnemy = (enemy: CardGameEnemyDefinition): LoadedCardGameEnemyDefinition => ({
    ...enemy,
    label: enemyLabel(enemy.id, enemy.label),
    passives: normalizeEnemyPassives(enemy.passives).map((passive) =>
        passive.id === 'phaseShift'
            ? { ...passive, label: copy(`enemy.${enemy.id}.phase`, passive.label) }
            : passive,
    ),
    combatTraits: normalizeCombatTraits(enemy.combatTraits),
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
