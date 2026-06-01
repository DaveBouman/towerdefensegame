import {
    TOWER_DEFINITIONS,
    type TowerDefinitionId,
    type TowerTier,
} from './towerCatalog';

const DRAFT_SIZE = 5;

/** Per-tier base weights; higher tiers scale up more as `wave` increases. */
const BASE_TIER_WEIGHT: Record<TowerTier, number> = {
    1: 100,
    2: 40,
    3: 16,
    4: 6,
    5: 2,
};

/**
 * Weight for offering a tier at a given wave (0 = before wave 1).
 * Low tiers dominate early; high tiers become more likely later.
 */
export const tierWeightForWave = (tier: TowerTier, wave: number): number =>
{
    const waveMultiplier = 1 + wave * 0.28;

    return BASE_TIER_WEIGHT[tier] * Math.pow(waveMultiplier, tier - 1);
};

const weightedPickId = (
    pool: readonly { id: TowerDefinitionId; weight: number }[],
): TowerDefinitionId | null =>
{
    const total = pool.reduce((sum, entry) => sum + entry.weight, 0);

    if (total <= 0 || pool.length === 0)
    {
        return null;
    }

    let roll = Math.random() * total;

    for (const entry of pool)
    {
        roll -= entry.weight;

        if (roll <= 0)
        {
            return entry.id;
        }
    }

    return pool[pool.length - 1]?.id ?? null;
};

/** Towers that can appear in a draft for the given wave (wave 0 = before wave 1). */
export const definitionsEligibleForDraft = (wave: number) =>
{
    if (wave === 0)
    {
        return TOWER_DEFINITIONS.filter((def) => def.tier === 1);
    }

    return [ ...TOWER_DEFINITIONS ];
};

/** Rolls unique tower ids for a draft (e.g. pick 1 of 5 at run start). */
export const rollTowerDraftChoices = (
    wave: number,
    count: number = DRAFT_SIZE,
): TowerDefinitionId[] =>
{
    const eligible = definitionsEligibleForDraft(wave);
    const targetCount = Math.min(count, eligible.length);
    const chosen = new Set<TowerDefinitionId>();
    const maxAttempts = targetCount * 40;

    for (let attempt = 0; chosen.size < targetCount && attempt < maxAttempts; attempt++)
    {
        const pool = eligible.map((def) => ({
            id: def.id,
            weight: chosen.has(def.id) ? 0 : tierWeightForWave(def.tier, wave),
        })).filter((entry) => entry.weight > 0);

        const pick = weightedPickId(pool);

        if (pick)
        {
            chosen.add(pick);
        }
    }

    if (chosen.size < targetCount)
    {
        for (const def of eligible)
        {
            if (chosen.size >= targetCount)
            {
                break;
            }

            chosen.add(def.id);
        }
    }

    return [ ...chosen ];
};
