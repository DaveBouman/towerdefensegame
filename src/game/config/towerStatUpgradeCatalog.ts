import type { TowerArchetype } from '../domain/towers/types';
import type { TowerUpgradeModifiers } from './towerUpgradeCatalog';

/** Stats that can be bought with gold between waves. */
export type TowerPurchasableStat = 'maxHealth' | 'range' | 'damage';

export interface TowerStatUpgradeDefinition {
    id: string;
    stat: TowerPurchasableStat;
    label: string;
    /** Per purchased level. */
    modifierPerLevel: number;
    baseGoldCost: number;
    costIncreasePerLevel: number;
    maxLevel?: number;
    /** When set, only these tower archetypes can buy this upgrade. */
    archetypes?: readonly TowerArchetype[];
}

export const TOWER_STAT_UPGRADE_CATALOG: readonly TowerStatUpgradeDefinition[] = [
    {
        id: 'hp-boost',
        stat: 'maxHealth',
        label: 'HP',
        modifierPerLevel: 25,
        baseGoldCost: 40,
        costIncreasePerLevel: 15,
    },
    {
        id: 'range-boost',
        stat: 'range',
        label: 'Range',
        modifierPerLevel: 0.25,
        baseGoldCost: 50,
        costIncreasePerLevel: 20,
    },
    {
        id: 'strength-boost',
        stat: 'damage',
        label: 'Strength',
        modifierPerLevel: 3,
        baseGoldCost: 45,
        costIncreasePerLevel: 18,
    },
];

const byId = new Map(TOWER_STAT_UPGRADE_CATALOG.map((d) => [ d.id, d ]));

export const getTowerStatUpgradeDefinition = (id: string): TowerStatUpgradeDefinition | undefined =>
    byId.get(id);

export const isStatUpgradeAvailableForArchetype = (
    def: TowerStatUpgradeDefinition,
    archetype: TowerArchetype,
): boolean =>
    !def.archetypes || def.archetypes.includes(archetype);

export const getTowerStatUpgradesForArchetype = (
    archetype: TowerArchetype,
): TowerStatUpgradeDefinition[] =>
    TOWER_STAT_UPGRADE_CATALOG.filter((def) => isStatUpgradeAvailableForArchetype(def, archetype));

export const getTowerStatUpgradeCost = (
    def: TowerStatUpgradeDefinition,
    currentLevel: number,
): number =>
    def.baseGoldCost + currentLevel * def.costIncreasePerLevel;

export const formatTowerStatUpgradeDelta = (def: TowerStatUpgradeDefinition): string =>
{
    if (def.stat === 'range')
    {
        return `+${def.modifierPerLevel} tiles / level`;
    }

    if (def.stat === 'damage')
    {
        return `+${def.modifierPerLevel} damage / level`;
    }

    return `+${def.modifierPerLevel} HP / level`;
};

export const computeStatUpgradeModifiers = (
    levels: ReadonlyMap<string, number> | Record<string, number>,
    archetype: TowerArchetype,
): TowerUpgradeModifiers =>
{
    const out: TowerUpgradeModifiers = {};

    for (const def of TOWER_STAT_UPGRADE_CATALOG)
    {
        if (!isStatUpgradeAvailableForArchetype(def, archetype))
        {
            continue;
        }

        const level = levels instanceof Map
            ? (levels.get(def.id) ?? 0)
            : (levels[def.id] ?? 0);

        if (level <= 0)
        {
            continue;
        }

        out[def.stat] = (out[def.stat] ?? 0) + def.modifierPerLevel * level;
    }

    return out;
};

export const mergeTowerUpgradeModifierMaps = (
    a: TowerUpgradeModifiers,
    b: TowerUpgradeModifiers,
): TowerUpgradeModifiers =>
{
    const out: TowerUpgradeModifiers = { ...a };

    for (const key of Object.keys(b) as (keyof TowerUpgradeModifiers)[])
    {
        const value = b[key];

        if (value !== undefined)
        {
            out[key] = (out[key] ?? 0) + value;
        }
    }

    return out;
};
