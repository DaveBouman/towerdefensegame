import { pickRandom, random, shuffleInPlace } from '../random/rng';
import { rollCardReward } from './rewards';
import { getTrinketDefinition, rollTrinketReward } from './trinkets';

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
    | 'trinket'
    | 'heal'
    | 'trap'
    | 'sun'
    | 'moon'
    | 'skull'
    | 'sword'
    | 'shield'
    | 'coin';

export type RunEventEffect =
    | { kind: 'heal'; amount: number }
    | { kind: 'damage'; amount: number }
    | { kind: 'gold'; amount: number }
    | { kind: 'add-card'; cardId: string }
    | { kind: 'add-curse'; cardId: string; count: number }
    | { kind: 'trinket'; trinketId: string }
    | { kind: 'open-wheel' }
    | { kind: 'open-icon-match' };

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

export interface IconMatchRound {
    /** Three icons shown — exactly two share `winningIcon`. */
    options: EventIconId[];
    winningIcon: EventIconId;
}

export interface AppliedEventMessage {
    text: string;
    tone: 'good' | 'bad' | 'neutral';
}

export interface AppliedEventResult {
    playerHealth: number;
    gold: number;
    deck: string[];
    trinkets: string[];
    messages: AppliedEventMessage[];
}

const EVENT_POOL: readonly (readonly [string, number])[] = [
    [ 'wheel-of-fate', 3 ],
    [ 'sign-matcher', 2 ],
    [ 'healing-spring', 2 ],
    [ 'cursed-idol', 2 ],
    [ 'gambler-offer', 2 ],
];

const WHEEL_SEGMENT_LIST: readonly WheelSegment[] = [
    { id: 'gold-20', label: '+20 Gold', icon: 'gold', effects: [ { kind: 'gold', amount: 20 } ] },
    { id: 'gold-35', label: '+35 Gold', icon: 'gold', effects: [ { kind: 'gold', amount: 35 } ] },
    { id: 'card', label: 'New Card', icon: 'card', effects: [ { kind: 'add-card', cardId: '__random__' } ] },
    { id: 'burden', label: 'Burden', icon: 'curse', effects: [ { kind: 'add-curse', cardId: 'burden', count: 1 } ] },
    { id: 'fuse', label: 'Fuse', icon: 'trap', effects: [ { kind: 'add-curse', cardId: 'fuse', count: 1 } ] },
    { id: 'trinket', label: 'Trinket', icon: 'trinket', effects: [ { kind: 'trinket', trinketId: '__random__' } ] },
    { id: 'heal', label: '+10 HP', icon: 'heal', effects: [ { kind: 'heal', amount: 10 } ] },
    { id: 'trap', label: '-5 HP', icon: 'trap', effects: [ { kind: 'damage', amount: 5 } ] },
];

const MATCH_SYMBOLS: readonly EventIconId[] = [ 'sun', 'moon', 'skull', 'sword', 'shield', 'coin' ];

export const RUN_EVENTS: Record<string, RunEventDefinition> = {
    'wheel-of-fate': {
        id: 'wheel-of-fate',
        title: 'Wheel of Fate',
        intro: 'A crooked wheel creaks in the dark. One spin — fortune, cards, curses, or worse.',
        icon: 'wheel',
        choices: [
            {
                id: 'spin',
                label: 'Spin the Wheel',
                description: 'Land on gold, a card, a curse, a trinket, healing, or a trap.',
                icon: 'wheel',
                effects: [ { kind: 'open-wheel' } ],
            },
        ],
    },
    'sign-matcher': {
        id: 'sign-matcher',
        title: 'Sign Matcher',
        intro: 'Three sigils flare to life. Two are twins — touch the matching pair to claim a reward.',
        icon: 'matcher',
        choices: [
            {
                id: 'play',
                label: 'Study the Signs',
                description: 'Pick the icon that appears twice. Win a card; miss and take damage.',
                icon: 'matcher',
                effects: [ { kind: 'open-icon-match' } ],
            },
        ],
    },
    'healing-spring': {
        id: 'healing-spring',
        title: 'Healing Spring',
        intro: 'Clear water bubbles from cracked stone. The air tastes like rain.',
        icon: 'spring',
        choices: [
            {
                id: 'drink',
                label: 'Drink Deep',
                description: 'Restore 18 HP.',
                icon: 'heal',
                effects: [ { kind: 'heal', amount: 18 } ],
            },
            {
                id: 'leave',
                label: 'Move On',
                description: 'Take nothing.',
                icon: 'coin',
                effects: [],
            },
        ],
    },
    'cursed-idol': {
        id: 'cursed-idol',
        title: 'Cursed Idol',
        intro: 'A relic thrums with power — and something sticky clings to its base.',
        icon: 'idol',
        choices: [
            {
                id: 'claim',
                label: 'Claim the Relic',
                description: 'Gain a trinket, but a Burden is added to your deck.',
                icon: 'trinket',
                effects: [
                    { kind: 'trinket', trinketId: '__random__' },
                    { kind: 'add-curse', cardId: 'burden', count: 1 },
                ],
            },
            {
                id: 'smash',
                label: 'Smash It',
                description: 'Gain 25 gold instead.',
                icon: 'gold',
                effects: [ { kind: 'gold', amount: 25 } ],
            },
        ],
    },
    'gambler-offer': {
        id: 'gambler-offer',
        title: "Gambler's Offer",
        intro: 'A hooded figure fans three cards. "Blood for bounty, or walk with coin."',
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
                label: 'Take the Coin',
                description: 'Gain 15 gold and leave.',
                icon: 'gold',
                effects: [ { kind: 'gold', amount: 15 } ],
            },
        ],
    },
};

/** Weighted-random event id (caller must seed first). */
export const rollRunEventId = (): string =>
{
    const total = EVENT_POOL.reduce((sum, [ , weight ]) => sum + weight, 0);
    let roll = random() * total;

    for (const [ id, weight ] of EVENT_POOL)
    {
        if (roll < weight)
        {
            return id;
        }

        roll -= weight;
    }

    return EVENT_POOL[0]![0];
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

export const buildIconMatchRound = (): IconMatchRound =>
{
    const pool = shuffleInPlace([ ...MATCH_SYMBOLS ]);
    const winningIcon = pool[0]!;
    const decoy = pool[1]!;

    return {
        winningIcon,
        options: shuffleInPlace([ winningIcon, winningIcon, decoy ]),
    };
};

const resolveRandomCard = (): string =>
    rollCardReward(1)[0] ?? 'attack';

const resolveRandomTrinket = (ownedTrinkets: readonly string[]): string | null =>
    rollTrinketReward(ownedTrinkets);

const expandEffect = (
    effect: RunEventEffect,
    ownedTrinkets: readonly string[],
): RunEventEffect[] =>
{
    if (effect.kind === 'add-card' && effect.cardId === '__random__')
    {
        return [ { kind: 'add-card', cardId: resolveRandomCard() } ];
    }

    if (effect.kind === 'trinket' && effect.trinketId === '__random__')
    {
        const trinketId = resolveRandomTrinket(ownedTrinkets);

        return trinketId ? [ { kind: 'trinket', trinketId } ] : [ { kind: 'gold', amount: 20 } ];
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
            return { text: `Gained ${effect.amount} gold.`, tone: effect.amount > 0 ? 'good' : 'neutral' };
        case 'add-card':
            return { text: `Added ${effect.cardId} to your deck.`, tone: 'good' };
        case 'add-curse':
            return {
                text: `Added ${effect.count}× ${effect.cardId} to your deck.`,
                tone: 'bad',
            };
        case 'trinket':
            return {
                text: `Gained ${getTrinketDefinition(effect.trinketId)?.label ?? effect.trinketId}.`,
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
        trinkets,
    }: {
        playerHealth: number;
        maxHealth: number;
        gold: number;
        deck: string[];
        trinkets: string[];
    },
): AppliedEventResult =>
{
    let health = playerHealth;
    let nextGold = gold;
    const nextDeck = [ ...deck ];
    const nextTrinkets = [ ...trinkets ];
    const messages: AppliedEventMessage[] = [];

    for (const rawEffect of effects)
    {
        for (const effect of expandEffect(rawEffect, nextTrinkets))
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
                    nextGold += effect.amount;
                    messages.push(describeEffect(effect));
                    break;
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
                case 'trinket':
                    if (!nextTrinkets.includes(effect.trinketId))
                    {
                        nextTrinkets.push(effect.trinketId);
                        messages.push(describeEffect(effect));
                    }
                    else
                    {
                        nextGold += 15;
                        messages.push({ text: 'Already owned that trinket — took 15 gold instead.', tone: 'neutral' });
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
        trinkets: nextTrinkets,
        messages: messages.filter((message) => message.text.length > 0),
    };
};

export const resolveIconMatchPick = (
    round: IconMatchRound,
    picked: EventIconId,
    state: {
        playerHealth: number;
        maxHealth: number;
        gold: number;
        deck: string[];
        trinkets: string[];
    },
): AppliedEventResult =>
{
    if (picked === round.winningIcon)
    {
        return applyRunEventEffects(
            [ { kind: 'add-card', cardId: '__random__' } ],
            state,
        );
    }

    return applyRunEventEffects(
        [ { kind: 'damage', amount: 6 } ],
        state,
    );
};

export const WHEEL_SEGMENTS = WHEEL_SEGMENT_LIST;

export const getWheelSegmentIndex = (segmentId: string): number =>
    WHEEL_SEGMENT_LIST.findIndex((segment) => segment.id === segmentId);
