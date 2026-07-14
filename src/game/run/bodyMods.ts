import { pickRandom } from '../random/rng';

/** Run-long cybernetic implants collected from events and ripperdocs. */
export interface BodyModDefinition {
    id: string;
    label: string;
    blurb: string;
    /** Short effect line shown in UI. */
    effect: string;
}

export const BODY_MOD_IDS = {
    chromeHeart: 'chrome-heart',
    overclockCell: 'overclock-cell',
    credSiphon: 'cred-siphon',
} as const;

export const BODY_MOD_DEFINITIONS: readonly BodyModDefinition[] = [
    {
        id: BODY_MOD_IDS.chromeHeart,
        label: 'Chrome Heart',
        blurb: 'Synthetic myocardium grafted behind the ribcage — runs hot, keeps you upright.',
        effect: '+10 max integrity for the rest of the run.',
    },
    {
        id: BODY_MOD_IDS.overclockCell,
        label: 'Overclock Cell',
        blurb: 'Neural capacitor wired into your combat reflex loop.',
        effect: '+1 energy each round.',
    },
    {
        id: BODY_MOD_IDS.credSiphon,
        label: 'Cred Siphon',
        blurb: 'Firmware skims loose eddies from every downed target.',
        effect: '+8 creds after each victory.',
    },
];

const bodyModMap = new Map(BODY_MOD_DEFINITIONS.map((mod) => [ mod.id, mod ]));

export const getBodyModDefinition = (id: string): BodyModDefinition | undefined =>
    bodyModMap.get(id);

export const getBodyModDefinitionOrThrow = (id: string): BodyModDefinition =>
{
    const definition = getBodyModDefinition(id);

    if (!definition)
    {
        throw new Error(`Unknown body mod: ${id}`);
    }

    return definition;
};

/** Body mods that can drop from the wheel or black-ice relic (not already owned). */
export const rollBodyModReward = (ownedIds: readonly string[]): string | null =>
{
    const available = BODY_MOD_DEFINITIONS
        .map((mod) => mod.id)
        .filter((id) => !ownedIds.includes(id));

    if (available.length === 0)
    {
        return null;
    }

    return pickRandom(available);
};
