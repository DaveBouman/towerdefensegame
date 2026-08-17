import { pickRandom, random, shuffleInPlace } from '../random/rng';
import { RUN_ECONOMY } from './config/runEconomy';
import type {
    EventIconId,
    RunEventDefinition,
    WheelSegment,
    IconMatchGrid,
} from './runEventTypes';

const eco = RUN_ECONOMY.events;
const wheelSeg = eco.wheel.segments;

export const ICON_MATCH_GRID_SIZE = eco.iconMatch.gridSize;
export const ICON_MATCH_GRID_COLS = eco.iconMatch.cols;
export const ICON_MATCH_ATTEMPTS = eco.iconMatch.attempts;
export const ICON_MATCH_PAIR_COUNT = ICON_MATCH_GRID_SIZE / 2;

export const WHEEL_SPIN_COST = eco.wheel.spinCost;

const EVENT_POOL: readonly (readonly [string, number])[] = [
    [ 'combo-trial', 3 ],
    [ 'wheel-of-fate', 3 ],
    [ 'sign-matcher', 3 ],
    [ 'healing-spring', 2 ],
    [ 'cursed-idol', 2 ],
    [ 'gambler-offer', 2 ],
    [ 'dead-drop', 2 ],
    [ 'signal-echo', 2 ],
    [ 'malware-spike', 2 ],
    [ 'data-shrine', 2 ],
    [ 'wire-rats', 2 ],
];

const WHEEL_SEGMENT_LIST: readonly WheelSegment[] = [
    {
        id: 'gold-20',
        label: `+${wheelSeg.gold20.gold} Creds (−${wheelSeg.gold20.damage} HP)`,
        icon: 'gold',
        effects: [
            { kind: 'gold', amount: wheelSeg.gold20.gold },
            { kind: 'damage', amount: wheelSeg.gold20.damage },
        ],
    },
    {
        id: 'gold-35',
        label: `+${wheelSeg.gold35.gold} Creds (−${wheelSeg.gold35.damage} HP)`,
        icon: 'gold',
        effects: [
            { kind: 'gold', amount: wheelSeg.gold35.gold },
            { kind: 'damage', amount: wheelSeg.gold35.damage },
        ],
    },
    {
        id: 'card',
        label: 'New Card (+ Burden)',
        icon: 'card',
        effects: [
            { kind: 'add-random-card' },
            { kind: 'add-curse', cardId: 'burden', count: 1 },
        ],
    },
    {
        id: 'burden',
        label: 'Burden',
        icon: 'curse',
        effects: [ { kind: 'add-curse', cardId: 'burden', count: 1 } ],
    },
    {
        id: 'fuse',
        label: 'Fuse',
        icon: 'trap',
        effects: [ { kind: 'add-curse', cardId: 'fuse', count: 1 } ],
    },
    {
        id: 'body-mod',
        label: 'Body Mod (+ Burden)',
        icon: 'body-mod',
        effects: [
            { kind: 'add-random-body-mod' },
            { kind: 'add-curse', cardId: 'burden', count: 1 },
        ],
    },
    {
        id: 'heal',
        label: `+${wheelSeg.heal.heal} HP (−${wheelSeg.heal.goldCost} creds)`,
        icon: 'heal',
        effects: [
            { kind: 'heal', amount: wheelSeg.heal.heal },
            { kind: 'lose-gold', amount: wheelSeg.heal.goldCost },
        ],
    },
    {
        id: 'trap',
        label: `-${wheelSeg.trap.damage} HP`,
        icon: 'trap',
        effects: [ { kind: 'damage', amount: wheelSeg.trap.damage } ],
    },
];

const MATCH_GRID_SYMBOLS: readonly EventIconId[] = [
    'sun', 'moon', 'skull', 'sword', 'shield', 'coin', 'heal', 'gold',
];

export const WHEEL_SEGMENTS = WHEEL_SEGMENT_LIST;

export const RUN_EVENTS: Record<string, RunEventDefinition> = {
    'combo-trial': {
        id: 'combo-trial',
        title: 'Neural Drill',
        intro: 'A drill sergeant jacks a training rig into your deck. Deal enough damage in one chain to pass the sim.',
        icon: 'puzzle',
        choices: [
            {
                id: 'accept',
                label: 'Jack In',
                description: 'Deal the target damage in one attack, then pick one of three reward cards — or ghost out.',
                icon: 'puzzle',
                effects: [ { kind: 'open-random-puzzle' } ],
            },
            {
                id: 'decline',
                label: 'Ghost Out',
                description: 'Disconnect without risk or reward.',
                icon: 'coin',
                effects: [],
            },
        ],
    },
    'wheel-of-fate': {
        id: 'wheel-of-fate',
        title: 'Fate Spinner',
        intro: 'A neon wheel flickers in the smog. One spin — creds, chrome, malware, or worse.',
        icon: 'wheel',
        choices: [
            {
                id: 'spin',
                label: 'Spin the Wheel',
                description: `Land on creds, a card, a curse, a body mod, healing, or a trap. Spin costs ${WHEEL_SPIN_COST} creds.`,
                icon: 'wheel',
                effects: [ { kind: 'open-wheel' } ],
            },
        ],
    },
    'sign-matcher': {
        id: 'sign-matcher',
        title: 'Glyph Matcher',
        intro: 'Sixteen glyphs hide eight twin pairs on a 4×4 grid. Flip two at a time — four attempts to match as many pairs as you can.',
        icon: 'matcher',
        choices: [
            {
                id: 'play',
                label: 'Scan the Grid',
                description: 'Memory match: more pairs = better rewards; whiffing every flip costs integrity.',
                icon: 'matcher',
                effects: [ { kind: 'open-icon-match' } ],
            },
        ],
    },
    'healing-spring': {
        id: 'healing-spring',
        title: 'Stasis Patch',
        intro: 'A street ripperdoc offers a quick patch job. Sterile foam hisses in the alley rain.',
        icon: 'spring',
        choices: [
            {
                id: 'drink',
                label: 'Take the Patch',
                description: 'Restore 18 HP, but pay 18 creds (or all you carry).',
                icon: 'heal',
                effects: [
                    { kind: 'heal', amount: 18 },
                    { kind: 'lose-gold', amount: 18 },
                ],
            },
            {
                id: 'leave',
                label: 'Keep Moving',
                description: 'Walk away.',
                icon: 'coin',
                effects: [],
            },
        ],
    },
    'cursed-idol': {
        id: 'cursed-idol',
        title: 'Black ICE Chrome',
        intro: 'Corrupted chrome thrums on a dead server rack — malware clings to the casing.',
        icon: 'idol',
        choices: [
            {
                id: 'claim',
                label: 'Install the Chrome',
                description: 'Gain a body mod, but a Burden is added to your deck.',
                icon: 'body-mod',
                effects: [
                    { kind: 'add-random-body-mod' },
                    { kind: 'add-curse', cardId: 'burden', count: 1 },
                ],
            },
            {
                id: 'smash',
                label: 'Scrap It',
                description: 'Gain 25 creds, but take 8 damage.',
                icon: 'gold',
                effects: [
                    { kind: 'gold', amount: 25 },
                    { kind: 'damage', amount: 8 },
                ],
            },
        ],
    },
    'gambler-offer': {
        id: 'gambler-offer',
        title: 'Chrome Dealer',
        intro: 'A hooded fixer fans three data-chips. "Blood for bounty, or walk with creds."',
        icon: 'gambler',
        choices: [
            {
                id: 'risk',
                label: 'Pay 8 HP',
                description: 'Take 8 damage and receive a random card.',
                icon: 'card',
                effects: [
                    { kind: 'damage', amount: 8 },
                    { kind: 'add-random-card' },
                ],
            },
            {
                id: 'coin',
                label: 'Take the Creds',
                description: 'Gain 15 creds, but take 6 damage.',
                icon: 'gold',
                effects: [
                    { kind: 'gold', amount: 15 },
                    { kind: 'damage', amount: 6 },
                ],
            },
        ],
    },
    'dead-drop': {
        id: 'dead-drop',
        title: 'Dead Drop',
        intro: 'A burst packet leaves creds in a wall cache — fuse malware tags the payload.',
        icon: 'gold',
        choices: [
            {
                id: 'take',
                label: 'Crack the Cache',
                description: 'Gain 25 creds, but a Fuse is added to your deck.',
                icon: 'gold',
                effects: [
                    { kind: 'gold', amount: 25 },
                    { kind: 'add-curse', cardId: 'fuse', count: 1 },
                ],
            },
            {
                id: 'leave',
                label: 'Leave It',
                description: 'Walk away clean.',
                icon: 'coin',
                effects: [],
            },
        ],
    },
    'signal-echo': {
        id: 'signal-echo',
        title: 'Signal Echo',
        intro: 'The ping returns twice — once as warmth, once as cred chime.',
        icon: 'heal',
        choices: [
            {
                id: 'patch',
                label: 'Take the Patch',
                description: 'Restore 10 HP.',
                icon: 'heal',
                effects: [ { kind: 'heal', amount: 10 } ],
            },
            {
                id: 'siphon',
                label: 'Siphon Creds',
                description: 'Gain 14 creds.',
                icon: 'gold',
                effects: [ { kind: 'gold', amount: 14 } ],
            },
        ],
    },
    'malware-spike': {
        id: 'malware-spike',
        title: 'Malware Spike',
        intro: 'Black ICE lashes out of the signal — creds scatter if you can soak the hit.',
        icon: 'trap',
        choices: [
            {
                id: 'ride',
                label: 'Ride the Spike',
                description: 'Take 10 damage and grab 30 creds.',
                icon: 'gold',
                effects: [
                    { kind: 'damage', amount: 10 },
                    { kind: 'gold', amount: 30 },
                ],
            },
            {
                id: 'disconnect',
                label: 'Hard Disconnect',
                description: 'Drop the line with no payout.',
                icon: 'shield',
                effects: [],
            },
        ],
    },
    'data-shrine': {
        id: 'data-shrine',
        title: 'Data Shrine',
        intro: 'A quiet node hums with archived vitals — pay for a full restore or take a trickle free.',
        icon: 'spring',
        choices: [
            {
                id: 'premium',
                label: 'Premium Sync',
                description: 'Restore 14 HP for 12 creds (or all you carry).',
                icon: 'heal',
                effects: [
                    { kind: 'heal', amount: 14 },
                    { kind: 'lose-gold', amount: 12 },
                ],
            },
            {
                id: 'trickle',
                label: 'Trickle Feed',
                description: 'Restore 5 HP for free.',
                icon: 'heal',
                effects: [ { kind: 'heal', amount: 5 } ],
            },
        ],
    },
    'wire-rats': {
        id: 'wire-rats',
        title: 'Wire Rats',
        intro: 'Scrap-code vermin chew your deck lines. Pay them off or eat the bite.',
        icon: 'skull',
        choices: [
            {
                id: 'feed',
                label: 'Feed the Rats',
                description: 'Take 6 damage and receive a random card.',
                icon: 'card',
                effects: [
                    { kind: 'damage', amount: 6 },
                    { kind: 'add-random-card' },
                ],
            },
            {
                id: 'pay',
                label: 'Pay Them Off',
                description: 'Lose 8 creds (or all you carry).',
                icon: 'coin',
                effects: [ { kind: 'lose-gold', amount: 8 } ],
            },
            {
                id: 'run',
                label: 'Cut the Line',
                description: 'Take 4 damage and leave.',
                icon: 'trap',
                effects: [ { kind: 'damage', amount: 4 } ],
            },
        ],
    },
};

/** Weighted-random event id (caller must seed first). */
export const rollRunEventId = (): string =>
    rollRunEventIdExcluding(new Set());

/** Picks a weighted event id, avoiding ids already used in the same map column. */
export const rollRunEventIdExcluding = (excluded: ReadonlySet<string>): string =>
{
    const pool = EVENT_POOL.filter(([ id ]) => !excluded.has(id));
    const choices = pool.length > 0 ? pool : EVENT_POOL;
    const total = choices.reduce((sum, [ , weight ]) => sum + weight, 0);
    let roll = random() * total;

    for (const [ id, weight ] of choices)
    {
        if (roll < weight)
        {
            return id;
        }

        roll -= weight;
    }

    return choices[0]![0];
};

export const getRunEvent = (eventId: string): RunEventDefinition =>
{
    const event = RUN_EVENTS[eventId];

    if (!event)
    {
        throw new Error(`Unknown run event: ${eventId}`);
    }

    return event;
};

export const rollWheelSegment = (): WheelSegment =>
    pickRandom([ ...WHEEL_SEGMENT_LIST ]);

/** Builds a shuffled 4×4 memory grid of icon pairs. */
export const buildIconMatchGrid = (): IconMatchGrid =>
{
    const tiles = MATCH_GRID_SYMBOLS.flatMap((icon) => [ icon, icon ]);

    return {
        tiles: shuffleInPlace(tiles),
    };
};

export const getWheelSegmentIndex = (segmentId: string): number =>
    WHEEL_SEGMENT_LIST.findIndex((segment) => segment.id === segmentId);
