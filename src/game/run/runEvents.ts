import { pickRandom, random, shuffleInPlace } from '../random/rng';
import { rollCardReward } from './rewards';
import { getBodyModDefinition, rollBodyModReward } from './bodyMods';

/** Icons used across run events (wheel, matcher, choices). */
export type EventIconId =
    | 'wheel'
    | 'matcher'
    | 'spring'
    | 'idol'
    | 'gambler'
    | 'gold'
    | 'card'
    | 'curse'
    | 'body-mod'
    | 'heal'
    | 'trap'
    | 'sun'
    | 'moon'
    | 'skull'
    | 'sword'
    | 'shield'
    | 'coin'
    | 'puzzle';

export type RunEventEffect =
    | { kind: 'heal'; amount: number }
    | { kind: 'damage'; amount: number }
    | { kind: 'gold'; amount: number }
    | { kind: 'lose-gold'; amount: number }
    | { kind: 'add-card'; cardId: string }
    | { kind: 'add-curse'; cardId: string; count: number }
    | { kind: 'body-mod'; bodyModId: string }
    | { kind: 'open-wheel' }
    | { kind: 'open-icon-match' }
    | { kind: 'open-puzzle'; puzzleId: string };

export interface RunEventChoice {
    id: string;
    label: string;
    description: string;
    icon: EventIconId;
    effects: RunEventEffect[];
}

export interface RunEventDefinition {
    id: string;
    title: string;
    intro: string;
    icon: EventIconId;
    choices: RunEventChoice[];
}

export interface WheelSegment {
    id: string;
    label: string;
    icon: EventIconId;
    effects: RunEventEffect[];
}

export interface IconMatchGrid {
    /** Shuffled face-down tiles — length 16, eight icon pairs. */
    tiles: EventIconId[];
}

export const ICON_MATCH_GRID_SIZE = 16;
export const ICON_MATCH_GRID_COLS = 4;
export const ICON_MATCH_ATTEMPTS = 4;
export const ICON_MATCH_PAIR_COUNT = ICON_MATCH_GRID_SIZE / 2;

export interface AppliedEventMessage {
    text: string;
    tone: 'good' | 'bad' | 'neutral';
}

export interface AppliedEventResult {
    playerHealth: number;
    gold: number;
    deck: string[];
    bodyMods: string[];
    messages: AppliedEventMessage[];
}

const EVENT_POOL: readonly (readonly [string, number])[] = [
    [ 'combo-trial', 3 ],
    [ 'wheel-of-fate', 3 ],
    [ 'sign-matcher', 3 ],
    [ 'healing-spring', 2 ],
    [ 'cursed-idol', 2 ],
    [ 'gambler-offer', 2 ],
];

const WHEEL_SEGMENT_LIST: readonly WheelSegment[] = [
    { id: 'gold-20', label: '+20 Creds (−5 HP)', icon: 'gold', effects: [ { kind: 'gold', amount: 20 }, { kind: 'damage', amount: 5 } ] },
    { id: 'gold-35', label: '+35 Creds (−8 HP)', icon: 'gold', effects: [ { kind: 'gold', amount: 35 }, { kind: 'damage', amount: 8 } ] },
    { id: 'card', label: 'New Card (+ Burden)', icon: 'card', effects: [ { kind: 'add-card', cardId: '__random__' }, { kind: 'add-curse', cardId: 'burden', count: 1 } ] },
    { id: 'burden', label: 'Burden', icon: 'curse', effects: [ { kind: 'add-curse', cardId: 'burden', count: 1 } ] },
    { id: 'fuse', label: 'Fuse', icon: 'trap', effects: [ { kind: 'add-curse', cardId: 'fuse', count: 1 } ] },
    { id: 'body-mod', label: 'Body Mod (+ Burden)', icon: 'body-mod', effects: [ { kind: 'body-mod', bodyModId: '__random__' }, { kind: 'add-curse', cardId: 'burden', count: 1 } ] },
    { id: 'heal', label: '+10 HP (−10 creds)', icon: 'heal', effects: [ { kind: 'heal', amount: 10 }, { kind: 'lose-gold', amount: 10 } ] },
    { id: 'trap', label: '-5 HP', icon: 'trap', effects: [ { kind: 'damage', amount: 5 } ] },
];

const MATCH_GRID_SYMBOLS: readonly EventIconId[] = [
    'sun', 'moon', 'skull', 'sword', 'shield', 'coin', 'heal', 'gold',
];

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
                effects: [ { kind: 'open-puzzle', puzzleId: '__random__' } ],
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
                description: 'Land on creds, a card, a curse, a body mod, healing, or a trap. Spin costs 5 creds.',
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
        title: 'Black ICE Relic',
        intro: 'Corrupted chrome thrums on a dead server rack — malware clings to the casing.',
        icon: 'idol',
        choices: [
            {
                id: 'claim',
                label: 'Install the Chrome',
                description: 'Gain a body mod, but a Burden is added to your deck.',
                icon: 'body-mod',
                effects: [
                    { kind: 'body-mod', bodyModId: '__random__' },
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
                    { kind: 'add-card', cardId: '__random__' },
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

const resolveRandomCard = (): string =>
    rollCardReward(1)[0] ?? 'attack';

const resolveRandomBodyMod = (ownedBodyMods: readonly string[]): string | null =>
    rollBodyModReward(ownedBodyMods);

const expandEffect = (
    effect: RunEventEffect,
    ownedBodyMods: readonly string[],
): RunEventEffect[] =>
{
    if (effect.kind === 'add-card' && effect.cardId === '__random__')
    {
        return [ { kind: 'add-card', cardId: resolveRandomCard() } ];
    }

    if (effect.kind === 'body-mod' && effect.bodyModId === '__random__')
    {
        const bodyModId = resolveRandomBodyMod(ownedBodyMods);

        return bodyModId ? [ { kind: 'body-mod', bodyModId } ] : [ { kind: 'gold', amount: 20 } ];
    }

    return [ effect ];
};

const describeEffect = (effect: RunEventEffect): AppliedEventMessage =>
{
    switch (effect.kind)
    {
        case 'heal':
            return { text: `Restored ${effect.amount} HP.`, tone: 'good' };
        case 'damage':
            return { text: `Took ${effect.amount} damage.`, tone: 'bad' };
        case 'gold':
            return {
                text: effect.amount >= 0
                    ? `Gained ${effect.amount} creds.`
                    : `Lost ${Math.abs(effect.amount)} creds.`,
                tone: effect.amount > 0 ? 'good' : 'bad',
            };
        case 'lose-gold':
            return { text: '', tone: 'bad' };
        case 'add-card':
            return { text: `Added ${effect.cardId} to your deck.`, tone: 'good' };
        case 'add-curse':
            return {
                text: `Added ${effect.count}× ${effect.cardId} to your deck.`,
                tone: 'bad',
            };
        case 'body-mod':
            return {
                text: `Installed ${getBodyModDefinition(effect.bodyModId)?.label ?? effect.bodyModId}.`,
                tone: 'good',
            };
        default:
            return { text: '', tone: 'neutral' };
    }
};

/** Applies event effects to run state and returns the updated snapshot. */
export const applyRunEventEffects = (
    effects: readonly RunEventEffect[],
    {
        playerHealth,
        maxHealth,
        gold,
        deck,
        bodyMods,
    }: {
        playerHealth: number;
        maxHealth: number;
        gold: number;
        deck: string[];
        bodyMods: string[];
    },
): AppliedEventResult =>
{
    let health = playerHealth;
    let nextGold = gold;
    const nextDeck = [ ...deck ];
    const nextBodyMods = [ ...bodyMods ];
    const messages: AppliedEventMessage[] = [];

    for (const rawEffect of effects)
    {
        for (const effect of expandEffect(rawEffect, nextBodyMods))
        {
            switch (effect.kind)
            {
                case 'heal':
                    health = Math.min(maxHealth, health + effect.amount);
                    messages.push(describeEffect(effect));
                    break;
                case 'damage':
                    health = Math.max(0, health - effect.amount);
                    messages.push(describeEffect(effect));
                    break;
                case 'gold':
                    nextGold = Math.max(0, nextGold + effect.amount);
                    messages.push(describeEffect(effect));
                    break;
                case 'lose-gold':
                {
                    const paid = Math.min(nextGold, effect.amount);
                    nextGold -= paid;

                    if (paid > 0)
                    {
                        messages.push({
                            text: paid < effect.amount
                                ? `Paid ${paid} creds (all you had).`
                                : `Paid ${paid} creds.`,
                            tone: 'bad',
                        });
                    }
                    else
                    {
                        messages.push({ text: 'Could not afford the cred cost.', tone: 'neutral' });
                    }

                    break;
                }
                case 'add-card':
                    nextDeck.push(effect.cardId);
                    messages.push(describeEffect(effect));
                    break;
                case 'add-curse':
                    for (let i = 0; i < effect.count; i++)
                    {
                        nextDeck.push(effect.cardId);
                    }
                    messages.push(describeEffect(effect));
                    break;
                case 'body-mod':
                    if (!nextBodyMods.includes(effect.bodyModId))
                    {
                        nextBodyMods.push(effect.bodyModId);
                        messages.push(describeEffect(effect));
                    }
                    else
                    {
                        nextGold += 15;
                        messages.push({ text: 'Already running that mod — took 15 creds instead.', tone: 'neutral' });
                        messages.push({ text: 'Took 5 damage from the chrome backlash.', tone: 'bad' });
                        health = Math.max(0, health - 5);
                    }
                    break;
                default:
                    break;
            }
        }
    }

    return {
        playerHealth: health,
        gold: nextGold,
        deck: nextDeck,
        bodyMods: nextBodyMods,
        messages: messages.filter((message) => message.text.length > 0),
    };
};

export const resolveIconMatchResult = (
    pairsMatched: number,
    state: {
        playerHealth: number;
        maxHealth: number;
        gold: number;
        deck: string[];
        bodyMods: string[];
    },
): AppliedEventResult =>
{
    const summary: AppliedEventMessage = {
        text: `Matched ${pairsMatched} of ${ICON_MATCH_PAIR_COUNT} pairs.`,
        tone: pairsMatched >= 3 ? 'good' : pairsMatched > 0 ? 'neutral' : 'bad',
    };

    if (pairsMatched === 0)
    {
        const result = applyRunEventEffects(
            [ { kind: 'damage', amount: 6 } ],
            state,
        );

        return {
            ...result,
            messages: [ summary, ...result.messages ],
        };
    }

    const effects: RunEventEffect[] = [
        { kind: 'gold', amount: pairsMatched * 4 },
        { kind: 'lose-gold', amount: pairsMatched * 2 },
    ];

    if (pairsMatched >= 3)
    {
        effects.push(
            { kind: 'add-card', cardId: '__random__' },
            { kind: 'lose-gold', amount: 12 },
            { kind: 'damage', amount: 3 },
        );
    }

    if (pairsMatched >= 6)
    {
        effects.push({ kind: 'gold', amount: 10 });
    }

    const result = applyRunEventEffects(effects, state);

    return {
        ...result,
        messages: [ summary, ...result.messages ],
    };
};

export const WHEEL_SPIN_COST = 5;

export const WHEEL_SEGMENTS = WHEEL_SEGMENT_LIST;

export const getWheelSpinEffects = (segment: WheelSegment): RunEventEffect[] => [
    { kind: 'lose-gold', amount: WHEEL_SPIN_COST },
    ...segment.effects,
];

export const getWheelSegmentIndex = (segmentId: string): number =>
    WHEEL_SEGMENT_LIST.findIndex((segment) => segment.id === segmentId);
