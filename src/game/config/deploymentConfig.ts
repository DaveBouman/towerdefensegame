import { CLOSE_RANGE_TOWER_PROFILE, LONG_RANGE_TOWER_PROFILE } from './towerProfiles';
import type { TowerArchetype } from '../domain/towers/types';

/** Order the player places starting units before wave 1. */
export const STARTING_DEPLOYMENT_QUEUE: readonly TowerArchetype[] = [ 'close', 'long' ];

export const deploymentUnitLabel = (archetype: TowerArchetype): string =>
    archetype === 'close'
        ? CLOSE_RANGE_TOWER_PROFILE.unitType
        : LONG_RANGE_TOWER_PROFILE.unitType;
