import weightsJson from './raceDraftWeights.json';
import type { TowerRace } from '../domain/towers/types';

interface RaceDraftWeightsJson {
    perOwnedTowerBias: Record<string, number>;
    maxBonusMultiplier: number;
}

export interface RaceDraftWeights {
    perOwnedTowerBias: Record<TowerRace, number>;
    maxBonusMultiplier: number;
}

const isRace = (value: string): value is TowerRace =>
    value === 'aether-dominion' || value === 'swarmforge-brood' || value === 'iron-covenant';

const parse = (raw: RaceDraftWeightsJson): RaceDraftWeights =>
{
    const perOwnedTowerBias = {} as Record<TowerRace, number>;

    for (const race of Object.keys(raw.perOwnedTowerBias))
    {
        if (!isRace(race))
        {
            throw new Error(`Invalid race in raceDraftWeights.json: ${race}`);
        }

        perOwnedTowerBias[race] = Math.max(0, raw.perOwnedTowerBias[race] ?? 0);
    }

    return {
        perOwnedTowerBias,
        maxBonusMultiplier: Math.max(1, raw.maxBonusMultiplier ?? 1),
    };
};

export const RACE_DRAFT_WEIGHTS = parse(weightsJson as RaceDraftWeightsJson);

export const raceDraftMultiplier = (
    race: TowerRace,
    ownedCount: number,
): number =>
{
    const perOwned = RACE_DRAFT_WEIGHTS.perOwnedTowerBias[race] ?? 0;

    return Math.min(
        1 + Math.max(0, ownedCount) * perOwned,
        RACE_DRAFT_WEIGHTS.maxBonusMultiplier,
    );
};

