import type { TowerProfile } from '../domain/towers/types';
import type { DamageType } from '../domain/combat/types';
import { parseCatalogColor } from './catalogColor';
import towersJson from './towers.json';

export type TowerTier = 1 | 2 | 3 | 4 | 5;

export type TowerDefinitionId = string;

export interface TowerDefinition {
    id: TowerDefinitionId;
    tier: TowerTier;
    profile: TowerProfile;
}

interface TowerJson {
    id: string;
    tier: number;
    archetype: string;
    unitType: string;
    range: number;
    damage: number;
    maxHealth: number;
    attacksPerSecond: number;
    color: string;
    sizeScale: number;
    isMobile: boolean;
    moveSpeedPerTick: number;
    goldValue: number;
    weaknesses: string[];
}

interface TowersFile {
    towers: TowerJson[];
}

const assertTowerTier = (tier: number): TowerTier =>
{
    if (tier >= 1 && tier <= 5 && Number.isInteger(tier))
    {
        return tier as TowerTier;
    }

    throw new Error(`Invalid tower tier in towers.json: ${tier}`);
};

const assertArchetype = (archetype: string): TowerProfile['archetype'] =>
{
    if (archetype === 'close' || archetype === 'long')
    {
        return archetype;
    }

    throw new Error(`Invalid tower archetype in towers.json: ${archetype}`);
};

const parseTower = (entry: TowerJson): TowerDefinition =>
{
    if (!entry.id)
    {
        throw new Error('Tower entry in towers.json is missing id');
    }

    const tier = assertTowerTier(entry.tier);
    const archetype = assertArchetype(entry.archetype);

    const profile: TowerProfile = {
        archetype,
        unitType: entry.unitType,
        range: entry.range,
        damage: entry.damage,
        maxHealth: entry.maxHealth,
        attacksPerSecond: entry.attacksPerSecond,
        color: parseCatalogColor(entry.color),
        isMobile: entry.isMobile,
        moveSpeedPerTick: entry.moveSpeedPerTick,
        sizeScale: entry.sizeScale,
        weaknesses: entry.weaknesses as DamageType[],
        goldValue: entry.goldValue,
    };

    return { id: entry.id, tier, profile };
};

const parseTowerFile = (file: TowersFile): ReadonlyMap<TowerDefinitionId, TowerDefinition> =>
{
    const catalog = new Map<TowerDefinitionId, TowerDefinition>();

    for (const entry of file.towers)
    {
        if (catalog.has(entry.id))
        {
            throw new Error(`Duplicate tower id in towers.json: ${entry.id}`);
        }

        catalog.set(entry.id, parseTower(entry));
    }

    return catalog;
};

const towerCatalog = parseTowerFile(towersJson as TowersFile);

export const TOWER_DEFINITIONS: readonly TowerDefinition[] = [ ...towerCatalog.values() ];

export const getTowerDefinition = (id: TowerDefinitionId): TowerDefinition | undefined =>
    towerCatalog.get(id);

export const hasTowerDefinition = (id: string): boolean =>
    towerCatalog.has(id);

export const getTowerDefinitionOrThrow = (id: TowerDefinitionId): TowerDefinition =>
{
    const definition = getTowerDefinition(id);

    if (!definition)
    {
        throw new Error(`Tower "${id}" is not defined in towers.json`);
    }

    return definition;
};

export const getTowerDefinitionLabel = (id: TowerDefinitionId): string =>
    getTowerDefinition(id)?.profile.unitType ?? id;

export const tierLabel = (tier: TowerTier): string => `Tier ${tier}`;
