import { bodyModLabel, poisonStatusName } from '../copy/strings';
import { pickRandom } from '../random/rng';
import type { CombatTraitInput } from '../cardGame/combat/combatTraits/types';

/** Run-long cybernetic implants collected from events and ripperdocs. */
export interface BodyModDefinition {
    id: string;
    label: string;
    blurb: string;
    /** Short effect line shown in UI. */
    effect: string;
    /** Optional combat traits granted for the rest of the run (shown below RUNNER). */
    combatTraits?: CombatTraitInput[];
}

export const BODY_MOD_IDS = {
    chromeHeart: 'chrome-heart',
    overclockCell: 'overclock-cell',
    credSiphon: 'cred-siphon',
    markFive: 'mark-five',
    markSeven: 'mark-seven',
    portsideGyro: 'portside-gyro',
    reactivePlating: 'reactive-plating',
    venomLatch: 'venom-latch',
    razorFeed: 'razor-feed',
    carapaceWeave: 'carapace-weave',
    pyreLink: 'pyre-link',
    hemorrhageCoil: 'hemorrhage-coil',
    gatekeeperSeal: 'gatekeeper-seal',
    latchArray: 'latch-array',
    capacitorBank: 'capacitor-bank',
} as const;

/** Attacks that trigger Mark VII's double-damage proc (7th, 14th, …). */
export const SEVENTH_STRIKE_INTERVAL = 7;

/** Attacks that trigger Mark V's double-damage proc (5th, 10th, …). */
export const FIFTH_STRIKE_INTERVAL = 5;

/** Left-routing card hits deal +30% damage with Portside Gyro installed. */
export const PORTSIDE_GYRO_DAMAGE_MULTIPLIER = 1.3;

/** Defends in one chain needed to store a Capacitor Bank charge. */
export const CAPACITOR_BANK_DEFEND_INTERVAL = 3;

/** Attack damage multiplier when Capacitor Bank discharges in-chain. */
export const CAPACITOR_BANK_ATTACK_MULTIPLIER = 1.5;

/** Run-wide attack intervals for proc body mods (shown in the body mod panel). */
export const INTERVAL_STRIKE_BODY_MOD_INTERVALS: Readonly<Record<string, number>> = {
    [BODY_MOD_IDS.markFive]: FIFTH_STRIKE_INTERVAL,
    [BODY_MOD_IDS.markSeven]: SEVENTH_STRIKE_INTERVAL,
};

export const isIntervalStrikeAttack = (attackNumber: number, interval: number): boolean =>
    attackNumber > 0 && interval > 0 && attackNumber % interval === 0;

export const isSeventhStrikeAttack = (attackNumber: number): boolean =>
    isIntervalStrikeAttack(attackNumber, SEVENTH_STRIKE_INTERVAL);

export const isFifthStrikeAttack = (attackNumber: number): boolean =>
    isIntervalStrikeAttack(attackNumber, FIFTH_STRIKE_INTERVAL);

export interface IntervalStrikeProgress {
    /** Attacks completed in the current cycle (0 … interval−1). */
    attacksInCycle: number;
    interval: number;
    /** True when the next attack will trigger double damage. */
    nextAttackIsProc: boolean;
}

/** Progress toward the next interval proc for run-wide attack counters. */
export const getIntervalStrikeProgress = (
    runAttackCount: number,
    interval: number,
): IntervalStrikeProgress =>
{
    const attacksInCycle = runAttackCount % interval;

    return {
        attacksInCycle,
        interval,
        nextAttackIsProc: attacksInCycle === interval - 1,
    };
};

/** @deprecated Prefer `getIntervalStrikeProgress(count, SEVENTH_STRIKE_INTERVAL)`. */
export type MarkSevenProgress = IntervalStrikeProgress;

/** Progress toward the next Mark VII proc for run-wide attack counters. */
export const getMarkSevenProgress = (runAttackCount: number): IntervalStrikeProgress =>
    getIntervalStrikeProgress(runAttackCount, SEVENTH_STRIKE_INTERVAL);

export const getMarkFiveProgress = (runAttackCount: number): IntervalStrikeProgress =>
    getIntervalStrikeProgress(runAttackCount, FIFTH_STRIKE_INTERVAL);

export const BODY_MOD_DEFINITIONS: readonly BodyModDefinition[] = [
    {
        id: BODY_MOD_IDS.chromeHeart,
        label: bodyModLabel(BODY_MOD_IDS.chromeHeart),
        blurb: 'Synthetic myocardium grafted behind the ribcage — runs hot, keeps you upright.',
        effect: '+10 max integrity for the rest of the run.',
    },
    {
        id: BODY_MOD_IDS.overclockCell,
        label: bodyModLabel(BODY_MOD_IDS.overclockCell),
        blurb: 'Neural capacitor wired into your combat reflex loop.',
        effect: '+1 energy each round.',
    },
    {
        id: BODY_MOD_IDS.credSiphon,
        label: bodyModLabel(BODY_MOD_IDS.credSiphon),
        blurb: 'Firmware skims loose eddies from every downed target.',
        effect: '+8 creds after each victory.',
    },
    {
        id: BODY_MOD_IDS.markFive,
        label: bodyModLabel(BODY_MOD_IDS.markFive),
        blurb: 'Aggressive strike firmware — shorter fuse, harder swing.',
        effect: 'Every 5th attack deals double damage.',
    },
    {
        id: BODY_MOD_IDS.markSeven,
        label: bodyModLabel(BODY_MOD_IDS.markSeven),
        blurb: 'Neural strike firmware overclocks every seventh combat swing.',
        effect: 'Every 7th attack deals double damage.',
    },
    {
        id: BODY_MOD_IDS.portsideGyro,
        label: bodyModLabel(BODY_MOD_IDS.portsideGyro),
        blurb: 'Left-vector stabilizers bleed lateral momentum into the payload.',
        effect: 'Left-routing cards deal 30% more damage.',
    },
    {
        id: BODY_MOD_IDS.reactivePlating,
        label: bodyModLabel(BODY_MOD_IDS.reactivePlating),
        blurb: 'Subdermal impact mesh hardens on first contact, then vents.',
        effect: 'First 2 card hits each fight deal no damage to you.',
        combatTraits: [ { id: 'hitWard', hitsBlocked: 2 } ],
    },
    {
        id: BODY_MOD_IDS.venomLatch,
        label: bodyModLabel(BODY_MOD_IDS.venomLatch),
        blurb: 'Toxin reservoirs clamp onto every poison payload before release.',
        effect: `${poisonStatusName()} stacks you apply are doubled.`,
    },
    {
        id: BODY_MOD_IDS.razorFeed,
        label: bodyModLabel(BODY_MOD_IDS.razorFeed),
        blurb: 'Mono-edge injectors push every cut harder through chrome and meat.',
        effect: 'Your damage dealt +2.',
    },
    {
        id: BODY_MOD_IDS.carapaceWeave,
        label: bodyModLabel(BODY_MOD_IDS.carapaceWeave),
        blurb: 'Layered plating multiplies every shield projection.',
        effect: 'Armor you gain is 50% stronger.',
    },
    {
        id: BODY_MOD_IDS.pyreLink,
        label: bodyModLabel(BODY_MOD_IDS.pyreLink),
        blurb: 'Ignition bus amplifies fire-alternation detonations.',
        effect: 'Fire alternation damage ×1.5.',
    },
    {
        id: BODY_MOD_IDS.hemorrhageCoil,
        label: bodyModLabel(BODY_MOD_IDS.hemorrhageCoil),
        blurb: 'Bleed firmware overclocks rupture payloads mid-chain.',
        effect: 'Bleed ability damage ×1.5.',
    },
    {
        id: BODY_MOD_IDS.gatekeeperSeal,
        label: bodyModLabel(BODY_MOD_IDS.gatekeeperSeal),
        blurb: 'Warden core shard — still warm from the final gate.',
        effect: '+15 max integrity and +1 energy each round for the rest of the run.',
    },
    {
        id: BODY_MOD_IDS.latchArray,
        label: bodyModLabel(BODY_MOD_IDS.latchArray),
        blurb: 'Grid clamps pin your opening play so the wipe cannot pull it loose.',
        effect: 'After the board wipes, your first Attack, Defend, and Skill placed this round stay on the grid.',
    },
    {
        id: BODY_MOD_IDS.capacitorBank,
        label: bodyModLabel(BODY_MOD_IDS.capacitorBank),
        blurb: 'Defend steps bleed kinetic charge into a combat capacitor — discharged on the next swing.',
        effect: 'Every 3rd Defend in a chain stores charge; your next Attack in that chain deals +50% damage.',
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

/** Body mods offered after lieutenant victories. */
export const LIEUTENANT_RELIC_POOL: readonly string[] = [
    BODY_MOD_IDS.markFive,
    BODY_MOD_IDS.markSeven,
    BODY_MOD_IDS.portsideGyro,
    BODY_MOD_IDS.reactivePlating,
    BODY_MOD_IDS.venomLatch,
    BODY_MOD_IDS.razorFeed,
    BODY_MOD_IDS.pyreLink,
    BODY_MOD_IDS.hemorrhageCoil,
    BODY_MOD_IDS.carapaceWeave,
    BODY_MOD_IDS.overclockCell,
    BODY_MOD_IDS.latchArray,
    BODY_MOD_IDS.capacitorBank,
];

export type BodyModRewardPool = 'standard' | 'lieutenant' | 'warden';

/** Body mods that can drop from the wheel or Black ICE event (not already owned). */
export const rollBodyModReward = (ownedIds: readonly string[]): string | null =>
    rollBodyModFromPool(BODY_MOD_DEFINITIONS.map((mod) => mod.id), ownedIds);

/** Rolls a body mod for battle rewards (lieutenant pool or warden unique). */
export const rollBodyModFromPool = (
    pool: readonly string[],
    ownedIds: readonly string[],
): string | null =>
{
    const available = pool.filter((id) => !ownedIds.includes(id));

    if (available.length === 0)
    {
        return null;
    }

    return pickRandom(available);
};

export const rollBattleBodyModReward = (
    pool: BodyModRewardPool,
    ownedIds: readonly string[],
): string | null =>
{
    if (pool === 'warden')
    {
        if (!ownedIds.includes(BODY_MOD_IDS.gatekeeperSeal))
        {
            return BODY_MOD_IDS.gatekeeperSeal;
        }

        return rollBodyModFromPool(LIEUTENANT_RELIC_POOL, ownedIds);
    }

    if (pool === 'lieutenant')
    {
        return rollBodyModFromPool(LIEUTENANT_RELIC_POOL, ownedIds);
    }

    return rollBodyModReward(ownedIds);
};
