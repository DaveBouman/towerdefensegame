import { getTowerDefinitionLabel, type TowerDefinitionId } from './towerCatalog';

export const deploymentUnitLabel = (towerId: TowerDefinitionId): string =>
    getTowerDefinitionLabel(towerId);
