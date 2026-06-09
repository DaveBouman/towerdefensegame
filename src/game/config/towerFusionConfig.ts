export const TOWER_FUSION_MIN_GROUP_SIZE = 3;

/** Reference multiplier when fusing the minimum group size (3 → 3.3× stats). */
export const TOWER_FUSION_REFERENCE_STAT_MULTIPLIER = 3.3;

/** Fused tower stat multiplier for a group of `groupSize` (excludes attack speed). */
export const getTowerFusionStatMultiplier = (groupSize: number): number =>
    groupSize * (TOWER_FUSION_REFERENCE_STAT_MULTIPLIER / TOWER_FUSION_MIN_GROUP_SIZE);
