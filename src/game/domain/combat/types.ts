export const DAMAGE_TYPES = [ 'physical', 'fire', 'water', 'earth', 'air' ] as const;

export type DamageType = typeof DAMAGE_TYPES[number];
export type ArmorByType = Record<DamageType, number>;

export interface EnemyBaseStats {
    maxHealth: number;
    damage: number;
    damageType: DamageType;
    defense: number;
    armorByType: ArmorByType;
    range: number;
    attacksPerSecond: number;
    /** World pixels moved per simulation tick. */
    moveSpeedPerTick: number;
    /** Gold awarded to the killer when this unit is destroyed. */
    goldValue: number;
}

export interface EnemyStatsSnapshot {
    maxHealth: number;
    damage: number;
    damageType: DamageType;
    defense: number;
    armorByType: ArmorByType;
    range: number;
    attacksPerSecond: number;
    moveSpeedPerTick: number;
    goldValue: number;
    killGold: number;
    resistances: Partial<Record<DamageType, number>>;
    perkIds: string[];
}
