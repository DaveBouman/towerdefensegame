import { pickRandom } from '../random/rng';

/** Run-long trinkets the player can collect from events and shops. */
export interface TrinketDefinition {
    id: string;
    label: string;
    blurb: string;
    /** Short effect line shown in UI. */
    effect: string;
}

export const TRINKET_DEFINITIONS: readonly TrinketDefinition[] = [
    {
        id: 'vitality-charm',
        label: 'Vitality Charm',
        blurb: 'A warm stone that swells your life force.',
        effect: '+10 max HP for the rest of the run.',
    },
    {
        id: 'energy-cell',
        label: 'Energy Cell',
        blurb: 'A humming capacitor wired into your battle rhythm.',
        effect: '+1 energy each turn.',
    },
    {
        id: 'lucky-pouch',
        label: 'Lucky Pouch',
        blurb: 'Jingles with promise between fights.',
        effect: '+8 gold after each victory.',
    },
];

const trinketMap = new Map(TRINKET_DEFINITIONS.map((trinket) => [ trinket.id, trinket ]));

export const getTrinketDefinition = (id: string): TrinketDefinition | undefined =>
    trinketMap.get(id);

export const getTrinketDefinitionOrThrow = (id: string): TrinketDefinition =>
{
    const definition = getTrinketDefinition(id);

    if (!definition)
    {
        throw new Error(`Unknown trinket: ${id}`);
    }

    return definition;
};

/** Trinkets that can drop from the wheel or cursed idol (not already owned). */
export const rollTrinketReward = (ownedIds: readonly string[]): string | null =>
{
    const available = TRINKET_DEFINITIONS
        .map((trinket) => trinket.id)
        .filter((id) => !ownedIds.includes(id));

    if (available.length === 0)
    {
        return null;
    }

    return pickRandom(available);
};
