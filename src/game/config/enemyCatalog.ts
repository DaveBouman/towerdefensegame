import type { EnemyBaseStats } from '../domain/combat/types';
import type { EnemyPerk } from '../domain/perks/types';
import type { EnemyConfig } from '../enemies/types';
import { parseCatalogColor } from './catalogColor';
import enemiesJson from './enemies.json';

export type EnemyDefinitionId = string;

export interface EnemyDefinition {
    id: EnemyDefinitionId;
    unitType: string;
    baseStats: EnemyBaseStats;
    visual: EnemyConfig;
    perks: readonly EnemyPerk[];
}

interface EnemyJson {
    id: string;
    unitType: string;
    maxHealth: number;
    damage: number;
    defense: number;
    range: number;
    attacksPerSecond: number;
    moveSpeedPerTick: number;
    goldValue: number;
    sizeScale: number;
    color: string;
    perks: unknown[];
}

interface EnemiesFile {
    enemies: EnemyJson[];
}

const parseEnemy = (entry: EnemyJson): EnemyDefinition =>
{
    if (!entry.id)
    {
        throw new Error('Enemy entry in enemies.json is missing id');
    }

    return {
        id: entry.id,
        unitType: entry.unitType,
        baseStats: {
            maxHealth: entry.maxHealth,
            damage: entry.damage,
            defense: entry.defense,
            range: entry.range,
            attacksPerSecond: entry.attacksPerSecond,
            moveSpeedPerTick: entry.moveSpeedPerTick,
            goldValue: entry.goldValue,
        },
        visual: {
            sizeScale: entry.sizeScale,
            color: parseCatalogColor(entry.color),
        },
        perks: entry.perks as EnemyPerk[],
    };
};

const parseEnemyFile = (file: EnemiesFile): ReadonlyMap<EnemyDefinitionId, EnemyDefinition> =>
{
    const catalog = new Map<EnemyDefinitionId, EnemyDefinition>();

    for (const entry of file.enemies)
    {
        if (catalog.has(entry.id))
        {
            throw new Error(`Duplicate enemy id in enemies.json: ${entry.id}`);
        }

        catalog.set(entry.id, parseEnemy(entry));
    }

    return catalog;
};

const enemyCatalog = parseEnemyFile(enemiesJson as EnemiesFile);

export const ENEMY_DEFINITIONS: readonly EnemyDefinition[] = [ ...enemyCatalog.values() ];

export const getEnemyDefinition = (id: EnemyDefinitionId): EnemyDefinition | undefined =>
    enemyCatalog.get(id);

export const hasEnemyDefinition = (id: string): boolean =>
    enemyCatalog.has(id);

export const getEnemyDefinitionOrThrow = (id: EnemyDefinitionId): EnemyDefinition =>
{
    const definition = getEnemyDefinition(id);

    if (!definition)
    {
        throw new Error(`Enemy "${id}" is not defined in enemies.json`);
    }

    return definition;
};
