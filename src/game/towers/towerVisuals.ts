import { getTowerDefinition, TOWER_DEFINITIONS } from '../config/towerCatalog';
import type { TowerDefinitionId } from '../config/towerCatalog';
import type { TowerArchetype } from '../domain/towers/types';
import type { TowerConfig } from './types';

export const getTowerVisualConfig = (definitionId: TowerDefinitionId): TowerConfig =>
{
    const definition = getTowerDefinition(definitionId);

    if (!definition)
    {
        throw new Error(`Unknown tower for visuals: ${definitionId}`);
    }

    return {
        sizeScale: definition.profile.sizeScale,
        color: definition.profile.color,
    };
};

export const getRangeIndicatorColor = (definitionId: TowerDefinitionId): number =>
    getTowerVisualConfig(definitionId).color;

export const getRangeIndicatorColorByArchetype = (archetype: TowerArchetype): number =>
{
    const definition = TOWER_DEFINITIONS.find((d) => d.profile.archetype === archetype);

    if (!definition)
    {
        throw new Error(`No tower in towers.json for archetype: ${archetype}`);
    }

    return definition.profile.color;
};
