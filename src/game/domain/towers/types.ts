import type { ArmorByType, DamageType } from '../combat/types';

export type TowerArchetype = 'close' | 'long';
export type TowerRace = 'aether-dominion' | 'swarmforge-brood' | 'iron-covenant';

export interface TowerProfile {
    archetype: TowerArchetype;
    race: TowerRace;
    unitType: string;
    range: number;
    damage: number;
    damageType: DamageType;
    defense: number;
    armorByType: ArmorByType;
    maxHealth: number;
    isMobile: boolean;
    /** World pixels moved per simulation tick. */
    moveSpeedPerTick: number;
    /** Attacks per second at the fixed simulation tick rate. */
    attacksPerSecond: number;
    color: number;
    sizeScale: number;
    weaknesses: DamageType[];
    /** Gold awarded to the killer when this unit is destroyed. */
    goldValue: number;
    /** Multiplier for per-kill permanent stat growth. */
    killRating: number;
    skills: string[];
    kamikazeExplosionRadiusTiles: number;
}
