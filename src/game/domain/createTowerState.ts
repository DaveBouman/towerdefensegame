import { getTowerDefinition } from '../config/towerCatalog';
import type { TowerDefinitionId } from '../config/towerCatalog';
import type { Grid } from '../grid/Grid';
import type { GridPosition } from '../grid/types';
import type { TowerArchetype } from './towers/types';
import { TowerState } from './TowerState';

const STARTING_CATALOG_UPGRADES: Record<TowerArchetype, readonly string[]> = {
    close: [ 'boots-of-speed', 'hands-of-fire' ],
    long: [ 'spyglass', 'bracers-of-haste' ],
};

export const createTowerState = (
    grid: Grid,
    spawnTile: GridPosition,
    definitionId: TowerDefinitionId,
): TowerState =>
{
    const definition = getTowerDefinition(definitionId);

    if (!definition)
    {
        throw new Error(`Unknown tower definition: ${definitionId}`);
    }

    const startingUpgrades = definition.tier === 1
        ? []
        : STARTING_CATALOG_UPGRADES[definition.profile.archetype];

    return new TowerState(
        grid,
        spawnTile,
        definition.id,
        definition.profile,
        startingUpgrades,
    );
};
