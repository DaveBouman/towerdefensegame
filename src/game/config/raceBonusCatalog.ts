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
        targetTowerId: string;
        sameRowOnly?: boolean;
        bonus: TowerUpgradeModifiers;
        maxStacks?: number;
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
        targetTowerId: TowerDefinitionId;
        sameRowOnly: boolean;
        bonus: TowerUpgradeModifiers;
        maxStacks: number;
    }[];
}

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
        specificPairBonuses: (raw.specificPairBonuses ?? []).map((entry) => ({
            sourceTowerId: entry.sourceTowerId,
            targetTowerId: entry.targetTowerId,
            sameRowOnly: entry.sameRowOnly ?? false,
            bonus: entry.bonus ?? {},
            maxStacks: Math.max(1, Math.floor(entry.maxStacks ?? 1)),
        })),
    };
};

export const RACE_BONUS_CONFIG = parse(bonusesJson as RaceBonusJson);

