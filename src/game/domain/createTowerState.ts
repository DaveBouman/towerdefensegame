import { CLOSE_RANGE_TOWER_PROFILE, LONG_RANGE_TOWER_PROFILE } from '../config/towerProfiles';
import type { Grid } from '../grid/Grid';
import type { GridPosition } from '../grid/types';
import type { TowerArchetype } from './towers/types';
import { TowerState } from './TowerState';

const STARTING_CATALOG_UPGRADES: Record<TowerArchetype, readonly string[]> = {
    close: [ 'boots-of-speed', 'hands-of-fire' ],
    long: [ 'spyglass', 'bracers-of-haste' ],
};

const profileForArchetype = (archetype: TowerArchetype) =>
    archetype === 'close' ? CLOSE_RANGE_TOWER_PROFILE : LONG_RANGE_TOWER_PROFILE;

export const createTowerState = (
    grid: Grid,
    spawnTile: GridPosition,
    archetype: TowerArchetype,
): TowerState =>
    new TowerState(
        grid,
        spawnTile,
        profileForArchetype(archetype),
        STARTING_CATALOG_UPGRADES[archetype],
    );
