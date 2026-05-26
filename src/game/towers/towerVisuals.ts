import type { TowerArchetype } from '../domain/towers/types';
import { CLOSE_RANGE_TOWER_PROFILE, LONG_RANGE_TOWER_PROFILE } from '../config/towerProfiles';
import type { TowerConfig } from './types';

const PROFILE_BY_ARCHETYPE = {
    close: CLOSE_RANGE_TOWER_PROFILE,
    long: LONG_RANGE_TOWER_PROFILE,
} as const;

export const getTowerVisualConfig = (archetype: TowerArchetype): TowerConfig => ({
    sizeScale: PROFILE_BY_ARCHETYPE[archetype].sizeScale,
    color: PROFILE_BY_ARCHETYPE[archetype].color,
});

export const getRangeIndicatorColor = (archetype: TowerArchetype): number =>
    PROFILE_BY_ARCHETYPE[archetype].color;
