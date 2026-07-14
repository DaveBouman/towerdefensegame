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
    markSeven: 'mark-seven',
} as const;

/** Attacks that trigger Mark VII's double-damage proc (7th, 14th, …). */
export const SEVENTH_STRIKE_INTERVAL = 7;

export const isSeventhStrikeAttack = (attackNumber: number): boolean =>
    attackNumber > 0 && attackNumber % SEVENTH_STRIKE_INTERVAL === 0;

export interface MarkSevenProgress {
    /** Attacks completed in the current 7-attack cycle (0–6). */
    attacksInCycle: number;
    interval: number;
    /** True when the next attack will trigger double damage. */
    nextAttackIsProc: boolean;
}

/** Progress toward the next Mark VII proc for run-wide attack counters. */
export const getMarkSevenProgress = (runAttackCount: number): MarkSevenProgress =>
{
    const attacksInCycle = runAttackCount % SEVENTH_STRIKE_INTERVAL;

    return {
        attacksInCycle,
        interval: SEVENTH_STRIKE_INTERVAL,
        nextAttackIsProc: attacksInCycle === SEVENTH_STRIKE_INTERVAL - 1,
    };
};

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
    {
        id: BODY_MOD_IDS.markSeven,
        label: 'Mark VII',
        blurb: 'Neural strike firmware overclocks every seventh combat swing.',
        effect: 'Every 7th attack deals double damage.',
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
