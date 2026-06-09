import type { TowerUpgradeModifiers } from './towerUpgradeCatalog';
import type { TowerDefinitionId } from './towerCatalog';
import type { TowerArchetype } from '../domain/towers/types';
import fusionBonusesJson from './towerFusionBonuses.json';

export const TOWER_FUSION_MIN_GROUP_SIZE = 3;

/** Reference multiplier when fusing the minimum group size (3 → 3.3× on configured stats). */
export const TOWER_FUSION_REFERENCE_STAT_MULTIPLIER = 3.3;

const FUSION_STAT_KEYS: (keyof TowerUpgradeModifiers)[] = [
    'range',
    'damage',
    'defense',
    'maxHealth',
    'attacksPerSecond',
    'moveSpeedPerTick',
    'goldValue',
];

const isFusionStatKey = (value: string): value is keyof TowerUpgradeModifiers =>
    FUSION_STAT_KEYS.includes(value as keyof TowerUpgradeModifiers);

const parseStatList = (values: readonly string[]): (keyof TowerUpgradeModifiers)[] =>
    values.filter(isFusionStatKey);

const archetypeDefaults = Object.fromEntries(
    Object.entries(fusionBonusesJson.archetypeDefaults).map(([ archetype, stats ]) =>
        [ archetype, parseStatList(stats) ]),
) as Record<TowerArchetype, (keyof TowerUpgradeModifiers)[]>;

const towerOverrides = Object.fromEntries(
    Object.entries(fusionBonusesJson.towers).map(([ towerId, stats ]) =>
        [ towerId, parseStatList(stats) ]),
) as Record<TowerDefinitionId, (keyof TowerUpgradeModifiers)[]>;

export const getTowerFusionGroupMultiplier = (groupSize: number): number =>
    groupSize * (TOWER_FUSION_REFERENCE_STAT_MULTIPLIER / TOWER_FUSION_MIN_GROUP_SIZE);

export const getFusionBonusStats = (
    definitionId: TowerDefinitionId,
    archetype: TowerArchetype,
): readonly (keyof TowerUpgradeModifiers)[] =>
    towerOverrides[definitionId]
    ?? archetypeDefaults[archetype]
    ?? [];

export const computeFusionStatMultipliers = (
    definitionId: TowerDefinitionId,
    archetype: TowerArchetype,
    groupSize: number,
): Partial<Record<keyof TowerUpgradeModifiers, number>> =>
{
    const factor = getTowerFusionGroupMultiplier(groupSize);
    const stats = getFusionBonusStats(definitionId, archetype);
    const multipliers: Partial<Record<keyof TowerUpgradeModifiers, number>> = {};

    for (const stat of stats)
    {
        multipliers[stat] = factor;
    }

    return multipliers;
};
