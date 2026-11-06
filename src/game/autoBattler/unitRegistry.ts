import unitsJson from './config/units.json';
import type { AbilityId, UnitDefinition, UnitInstance } from './types';

const definitions = unitsJson as UnitDefinition[];

const byId = new Map(definitions.map((unit) => [ unit.id, unit ]));

let nextUid = 1;

export const resetAutoBattlerUidCounter = (): void =>
{
    nextUid = 1;
};

export const getAllUnitDefinitions = (): readonly UnitDefinition[] => definitions;

export const getUnitDefinition = (id: string): UnitDefinition | undefined =>
    byId.get(id);

export const getUnitDefinitionOrThrow = (id: string): UnitDefinition =>
{
    const def = byId.get(id);

    if (!def)
    {
        throw new Error(`Unknown auto-battler unit: ${id}`);
    }

    return def;
};

export const getUnitsForTier = (tier: number): UnitDefinition[] =>
    definitions.filter((unit) => unit.tier <= tier);

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
