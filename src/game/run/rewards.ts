import { getCardDefinitionOrThrow } from '../cardGame/config/cardRegistry';
import { shuffleInPlace } from '../random/rng';

/**
 * Rewards granted for defeating an enemy. Kept as a discriminated union so new
 * reward kinds (e.g. trinkets, gold) can be added without touching existing
 * handling. Trinkets will later modify the numeric knobs below (e.g. raise
 * `pickCount` to "pick two", or flag a reward as rerollable).
 */
export interface CardReward {
    kind: 'card';
    /** How many card choices to present. */
    choiceCount: number;
    /** How many of the presented cards the player keeps. */
    pickCount: number;
    /** Whether the player may reroll the offered choices (trinket-driven). */
    rerollable: boolean;
}

export type RunReward = CardReward;

export const DEFAULT_CARD_REWARD: CardReward = {
    kind: 'card',
    choiceCount: 3,
    pickCount: 1,
    rerollable: false,
};

/** Card definition ids eligible to be offered as battle rewards. */
export const REWARD_CARD_POOL: readonly string[] = [
    'attack',
    'defend',
    'attack-special',
    'attack-leap',
    'defend-special',
    'defend-leap',
    'joker',
    'loop-reset',
    'poison',
    'fire',
    'rupture',
    'bulwark',
    'surge',
    'corner-strike',
    'corner-defense',
];

/** Picks `choiceCount` distinct card definition ids at random from the reward pool. */
export const rollCardReward = (choiceCount: number): string[] =>
{
    const pool = shuffleInPlace([ ...REWARD_CARD_POOL ]);

    return pool.slice(0, Math.max(0, Math.min(choiceCount, pool.length)));
};

const CARD_BLURBS: Record<string, string> = {
    attack: 'Deals damage to the enemy along the chain.',
    defend: 'Grants armor that soaks the next enemy hits.',
    poison: 'Poisons the trail — later defends stack poison that ticks each turn.',
    fire: 'Ignites alternation — bonus damage on alternating steps.',
    joker: 'Wild arrow — choose its direction mid-chain.',
    'loop-reset': 'Restarts the chain along a second arrow.',
    rupture: 'Bleed — more damage the more attacks you chain.',
    bulwark: 'Fortify — more armor the more defends you chain.',
    surge: 'Overload — damage per skill card, doubled with a Joker.',
    'corner-strike': 'Hooks around the corner to a forward-diagonal tile.',
    'corner-defense': 'Armor that hooks around the corner to a forward-diagonal tile.',
};

export interface CardRewardDisplay {
    definitionId: string;
    label: string;
    power: number;
    blurb: string;
}

/** Resolves display data for a card offered as a reward. */
export const describeCardReward = (definitionId: string): CardRewardDisplay =>
{
    const definition = getCardDefinitionOrThrow(definitionId);

    return {
        definitionId,
        label: definition.label,
        power: definition.power,
        blurb: CARD_BLURBS[definition.id]
            ?? CARD_BLURBS[definition.behaviorId]
            ?? 'A new card for your deck.',
    };
};
