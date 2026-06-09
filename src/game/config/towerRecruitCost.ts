import type { TowerDefinition, TowerDefinitionId, TowerTier } from './towerCatalog';
import { getTowerDefinition } from './towerCatalog';

const RECRUIT_COST_BY_TIER: Record<TowerTier, number> = {
    1: 50,
    2: 85,
    3: 130,
    4: 185,
    5: 250,
};

/** Starter pick before wave 1 is free; later recruits cost gold. */
export const getTowerRecruitCost = (towerId: TowerDefinitionId, wave: number): number =>
{
    if (wave === 0)
    {
        return 0;
    }

    const def = getTowerDefinition(towerId);

    if (!def)
    {
        return Number.POSITIVE_INFINITY;
    }

    return recruitCostForDefinition(def);
};

export const recruitCostForDefinition = (def: TowerDefinition): number =>
    RECRUIT_COST_BY_TIER[def.tier];
