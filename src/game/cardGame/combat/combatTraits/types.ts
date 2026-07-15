export type CombatTraitId = 'damageCap' | 'hitWard';

export interface DamageCapTraitConfig {
    id: 'damageCap';
    /** Maximum damage taken from a single card hit. */
    maxPerCard: number;
}

export interface HitWardTraitConfig {
    id: 'hitWard';
    /** Number of incoming card hits that deal no damage. */
    hitsBlocked: number;
}

export type CombatTraitConfig = DamageCapTraitConfig | HitWardTraitConfig;

export type CombatTraitInput = CombatTraitId | CombatTraitConfig;
