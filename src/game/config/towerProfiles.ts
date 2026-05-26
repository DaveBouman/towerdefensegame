import type { TowerProfile } from '../domain/towers/types';

export const CLOSE_RANGE_TOWER_PROFILE: TowerProfile = {
    archetype: 'close',
    unitType: 'Close Range Tower',
    range: 1.25,
    damage: 14,
    maxHealth: 220,
    isMobile: true,
    moveSpeedPerTick: 16,
    attacksPerSecond: 1.1,
    color: 0x2ecc71,
    sizeScale: 0.75,
    weaknesses: [],
    goldValue: 35,
};

export const LONG_RANGE_TOWER_PROFILE: TowerProfile = {
    archetype: 'long',
    unitType: 'Long Range Tower',
    range: 4,
    damage: 6,
    maxHealth: 140,
    isMobile: false,
    moveSpeedPerTick: 0,
    attacksPerSecond: 0.83,
    color: 0x3498db,
    sizeScale: 0.75,
    weaknesses: [],
    goldValue: 25,
};
