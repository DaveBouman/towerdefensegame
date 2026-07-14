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
    | 'coin'
    | 'puzzle';

export type RunEventEffect =
    | { kind: 'heal'; amount: number }
    | { kind: 'damage'; amount: number }
    | { kind: 'gold'; amount: number }
    | { kind: 'lose-gold'; amount: number }
    | { kind: 'add-card'; cardId: string }
    | { kind: 'add-curse'; cardId: string; count: number }
    | { kind: 'trinket'; trinketId: string }
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
    trinkets: string[];
    messages: AppliedEventMessage[];
}

const EVENT_POOL: readonly (readonly [string, number])[] = [
    [ 'combo-trial', 3 ],
    [ 'wheel-of-fate', 3 ],
    [ 'sign-matcher', 2 ],
    [ 'healing-spring', 2 ],
    [ 'cursed-idol', 2 ],
    [ 'gambler-offer', 2 ],
];

const WHEEL_SEGMENT_LIST: readonly WheelSegment[] = [
    { id: 'gold-20', label: '+20 Gold (−5 HP)', icon: 'gold', effects: [ { kind: 'gold', amount: 20 }, { kind: 'damage', amount: 5 } ] },
    { id: 'gold-35', label: '+35 Gold (−8 HP)', icon: 'gold', effects: [ { kind: 'gold', amount: 35 }, { kind: 'damage', amount: 8 } ] },
    { id: 'card', label: 'New Card (+ Burden)', icon: 'card', effects: [ { kind: 'add-card', cardId: '__random__' }, { kind: 'add-curse', cardId: 'burden', count: 1 } ] },
    { id: 'burden', label: 'Burden', icon: 'curse', effects: [ { kind: 'add-curse', cardId: 'burden', count: 1 } ] },
    { id: 'fuse', label: 'Fuse', icon: 'trap', effects: [ { kind: 'add-curse', cardId: 'fuse', count: 1 } ] },
    { id: 'trinket', label: 'Trinket (+ Burden)', icon: 'trinket', effects: [ { kind: 'trinket', trinketId: '__random__' }, { kind: 'add-curse', cardId: 'burden', count: 1 } ] },
    { id: 'heal', label: '+10 HP (−10 gold)', icon: 'heal', effects: [ { kind: 'heal', amount: 10 }, { kind: 'lose-gold', amount: 10 } ] },
    { id: 'trap', label: '-5 HP', icon: 'trap', effects: [ { kind: 'damage', amount: 5 } ] },
];

const MATCH_GRID_SYMBOLS: readonly EventIconId[] = [
    'sun', 'moon', 'skull', 'sword', 'shield', 'coin', 'heal', 'gold',
];

export const RUN_EVENTS: Record<string, RunEventDefinition> = {
    'combo-trial': {
        id: 'combo-trial',
        title: 'Combo Trial',
        intro: 'A drill master sets out cards and a training dummy. Deal enough damage in one chain to pass.',
        icon: 'puzzle',
        choices: [
            {
                id: 'accept',
                label: 'Accept the Trial',
                description: 'Get puzzle cards and deal at least the target damage in a single attack.',
                icon: 'puzzle',
                effects: [ { kind: 'open-puzzle', puzzleId: '__random__' } ],
            },
            {
                id: 'decline',
                label: 'Walk Away',
                description: 'Leave without risk or reward.',
                icon: 'coin',
                effects: [],
            },
        ],
    },
    'wheel-of-fate': {
        id: 'wheel-of-fate',
        title: 'Wheel of Fate',
        intro: 'A crooked wheel creaks in the dark. One spin — fortune, cards, curses, or worse.',
        icon: 'wheel',
        choices: [
            {
                id: 'spin',
                label: 'Spin the Wheel',
                description: 'Land on gold, a card, a curse, a trinket, healing, or a trap. Spin costs 5 gold.',
                icon: 'wheel',
                effects: [ { kind: 'open-wheel' } ],
            },
        ],
    },
    'sign-matcher': {
        id: 'sign-matcher',
        title: 'Sign Matcher',
        intro: 'Sixteen sigils hide eight twin pairs on a 4×4 grid. Flip two at a time — you get four attempts to match as many pairs as you can.',
        icon: 'matcher',
        choices: [
            {
                id: 'play',
                label: 'Study the Signs',
                description: 'Memory match: more pairs = better rewards; whiffing every flip costs HP.',
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
                description: 'Restore 18 HP, but pay 18 gold (or all you carry).',
                icon: 'heal',
                effects: [
                    { kind: 'heal', amount: 18 },
                    { kind: 'lose-gold', amount: 18 },
                ],
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
                description: 'Gain 25 gold, but take 8 damage.',
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
                description: 'Gain 15 gold, but take 6 damage.',
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
            return {
                text: effect.amount >= 0
                    ? `Gained ${effect.amount} gold.`
                    : `Lost ${Math.abs(effect.amount)} gold.`,
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
                                ? `Paid ${paid} gold (all you had).`
                                : `Paid ${paid} gold.`,
                            tone: 'bad',
                        });
                    }
                    else
                    {
                        messages.push({ text: 'Could not afford the gold cost.', tone: 'neutral' });
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
                        messages.push({ text: 'Took 5 damage from the relic\'s backlash.', tone: 'bad' });
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
        trinkets: nextTrinkets,
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
        trinkets: string[];
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
