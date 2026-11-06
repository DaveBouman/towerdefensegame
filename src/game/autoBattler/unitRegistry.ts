import type { AbilityId, UnitInstance } from './types';
import {
    getAllUnitDefinitions,
    getUnitDefinition,
    getUnitDefinitionOrThrow,
} from './shared/unitCatalog';

export {
    getAllUnitDefinitions,
    getUnitDefinition,
    getUnitDefinitionOrThrow,
};

let nextUid = 1;

export const resetAutoBattlerUidCounter = (): void =>
{
    nextUid = 1;
};

export const getUnitsForTier = (tier: number) =>
    getAllUnitDefinitions().filter((unit) => unit.tier <= tier);

export const createUnitInstance = (
    definitionId: string,
    overrides?: Partial<Pick<UnitInstance, 'attack' | 'health' | 'maxHealth'>>,
): UnitInstance =>
{
    const def = getUnitDefinitionOrThrow(definitionId);
    const attack = overrides?.attack ?? def.attack;
    const health = overrides?.health ?? def.health;
    const maxHealth = overrides?.maxHealth ?? health;

    return {
        uid: `u${nextUid++}`,
        definitionId,
        attack,
        health,
        maxHealth,
    };
};

export const cloneUnit = (unit: UnitInstance): UnitInstance =>
    ({
        uid: unit.uid,
        definitionId: unit.definitionId,
        attack: unit.attack,
        health: unit.health,
        maxHealth: unit.maxHealth,
    });

export const cloneTeam = (team: readonly (UnitInstance | null)[]): (UnitInstance | null)[] =>
    team.map((slot) => (slot ? cloneUnit(slot) : null));

export const getAbilityId = (definitionId: string): AbilityId =>
    getUnitDefinitionOrThrow(definitionId).abilityId;
