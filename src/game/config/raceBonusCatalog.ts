import bonusesJson from './raceBonuses.json';
import type { TowerUpgradeModifiers } from './towerUpgradeCatalog';
import type { TowerRace } from '../domain/towers/types';
import type { TowerDefinitionId } from './towerCatalog';

interface RaceBonusJson {
    adjacencyRadiusTiles: number;
    stackMode?: 'perNeighbor' | 'nonStacking';
    maxStacksPerSource?: number;
    sameRacePerNeighborBonus: Record<string, TowerUpgradeModifiers>;
    crossRacePerNeighborBonus: {
        sourceRace: string;
        targetRace: string;
        bonus: TowerUpgradeModifiers;
    }[];
    specificPairBonuses?: {
        sourceTowerId: string;
        targetTowerId?: string;
        targetTowerIds?: string[];
        sameRowOnly?: boolean;
        useSpawnTiles?: boolean;
        bonus: TowerUpgradeModifiers;
        maxStacks?: number;
        countScaling?: number[];
    }[];
}

export interface RaceBonusConfig {
    adjacencyRadiusTiles: number;
    stackMode: 'perNeighbor' | 'nonStacking';
    maxStacksPerSource: number;
    sameRacePerNeighborBonus: Record<TowerRace, TowerUpgradeModifiers>;
    crossRacePerNeighborBonus: {
        sourceRace: TowerRace;
        targetRace: TowerRace;
        bonus: TowerUpgradeModifiers;
    }[];
    specificPairBonuses: {
        sourceTowerId: TowerDefinitionId;
        targetTowerIds: TowerDefinitionId[];
        sameRowOnly: boolean;
        useSpawnTiles: boolean;
        bonus: TowerUpgradeModifiers;
        maxStacks: number;
        countScaling: number[] | null;
    }[];
}

export const getCumulativeScalingDelta = (
    scaling: readonly number[] | null,
    count: number,
): number =>
{
    if (!scaling?.length || count <= 0)
    {
        return 1;
    }

    const current = scaling[Math.min(count, scaling.length) - 1] ?? 0;
    const previous = count > 1 ? (scaling[Math.min(count - 1, scaling.length) - 1] ?? 0) : 0;

    return Math.max(0, current - previous);
};

const isRace = (value: string): value is TowerRace =>
    value === 'aether-dominion' || value === 'swarmforge-brood' || value === 'iron-covenant';

const parse = (raw: RaceBonusJson): RaceBonusConfig =>
{
    const same = {} as Record<TowerRace, TowerUpgradeModifiers>;

    for (const race of Object.keys(raw.sameRacePerNeighborBonus))
    {
        if (!isRace(race))
        {
            throw new Error(`Invalid race in raceBonuses.json: ${race}`);
        }

        same[race] = raw.sameRacePerNeighborBonus[race] ?? {};
    }

    const cross = raw.crossRacePerNeighborBonus.map((entry) =>
    {
        if (!isRace(entry.sourceRace) || !isRace(entry.targetRace))
        {
            throw new Error(
                `Invalid cross-race bonus pair in raceBonuses.json: ${entry.sourceRace} -> ${entry.targetRace}`,
            );
        }

        return {
            sourceRace: entry.sourceRace,
            targetRace: entry.targetRace,
            bonus: entry.bonus ?? {},
        };
    });

    return {
        adjacencyRadiusTiles: Math.max(1, Math.floor(raw.adjacencyRadiusTiles)),
        stackMode: raw.stackMode === 'nonStacking' ? 'nonStacking' : 'perNeighbor',
        maxStacksPerSource: Math.max(1, Math.floor(raw.maxStacksPerSource ?? 99)),
        sameRacePerNeighborBonus: same,
        crossRacePerNeighborBonus: cross,
        specificPairBonuses: (raw.specificPairBonuses ?? []).map((entry) =>
        {
            const targetTowerIds = entry.targetTowerIds?.length
                ? entry.targetTowerIds
                : (entry.targetTowerId ? [ entry.targetTowerId ] : []);

            if (targetTowerIds.length === 0)
            {
                throw new Error(`specificPairBonuses for ${entry.sourceTowerId} requires targetTowerId or targetTowerIds`);
            }

            return {
                sourceTowerId: entry.sourceTowerId,
                targetTowerIds,
                sameRowOnly: entry.sameRowOnly ?? false,
                useSpawnTiles: entry.useSpawnTiles ?? false,
                bonus: entry.bonus ?? {},
                maxStacks: Math.max(1, Math.floor(entry.maxStacks ?? 1)),
                countScaling: entry.countScaling?.map((value) => Number(value)).filter((value) => Number.isFinite(value) && value > 0) ?? null,
            };
        }),
    };
};

export const RACE_BONUS_CONFIG = parse(bonusesJson as RaceBonusJson);

