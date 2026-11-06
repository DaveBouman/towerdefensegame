import unitsJson from '../config/units.json';
import type { UnitDefinition } from '../types';

const definitions = unitsJson as UnitDefinition[];
const byId = new Map(definitions.map((unit) => [ unit.id, unit ]));

/** Client-safe catalog — labels/tooltips/base stats only. No instance UIDs. */
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
