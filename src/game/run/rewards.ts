import { getCardDefinitionOrThrow } from '../cardGame/config/cardRegistry';
import { shuffleInPlace } from '../random/rng';

/**
 * Rewards granted for defeating an enemy. Kept as a discriminated union so new
 * reward kinds (e.g. body mods, creds) can be added without touching existing
 * handling. Body mods modify the numeric knobs below (e.g. raise
 * `pickCount` to "pick two", or flag a reward as rerollable).
 */
export interface CardReward {
    kind: 'card';
    /** How many card choices to present. */
    choiceCount: number;
    /** How many of the presented cards the player keeps. */
    pickCount: number;
    /** Whether the player may reroll the offered choices (body-mod-driven). */
    rerollable: boolean;
}

export type RunReward = CardReward;

export const DEFAULT_CARD_REWARD: CardReward = {
    kind: 'card',
    choiceCount: 3,
    pickCount: 1,
    rerollable: false,
};

/** Shown on battle victory card rewards. */
export const BATTLE_REWARD_RULES: readonly string[] = [
    'Three random cards are offered from the reward pool.',
    'Select one card to add to your deck, or continue without taking a card.',
    'Your choice is permanent for the rest of the run.',
];

/** Shown on combo-trial briefs and reward screens. */
export const PUZZLE_TRIAL_RULES: readonly string[] = [
    'You receive a fixed hand — place every card on the board.',
    'Set chain start in column 0, then launch one attack.',
    'Deal at least the target damage in that single attack.',
    'The training dummy does not fight back.',
    'Pass: pick one reward card (or none). Fail: take damage.',
];

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
    'shiv',
    'miasma',
    'cinder',
    'lacerate',
    'scorch',
    'bramble',
    'glitch',
    'hardwire',
    'patch',
    'overclock',
    'echo',
    'courier',
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
    'corner-defense': 'Defend card that turns the corner to the next tile.',
    shiv: 'Diagonal bleed starter — rewards attack-heavy routes from the corners.',
    miasma: 'Diagonal poison trail — angles your toxin through the grid.',
    cinder: 'Diagonal fire — starts alternation chains from off-axis tiles.',
    lacerate: 'Lunge + bleed — skip a tile and stack attack bonuses.',
    scorch: 'Corner fire — hooks around a bend while igniting alternation.',
    bramble: 'Corner fortify — bends the chain while stacking defend bonuses.',
    glitch: 'Enemy attack -10% for the rest of the chain and enemy response.',
    hardwire: 'Shield gained +10% from defend cards and armor effects.',
    patch: 'Damage taken -10% from enemy attacks and reflect damage.',
    overclock: 'Damage dealt +10% from your attack steps and bonuses.',
    echo: 'Re-activates the previous chain card — repeats its damage, armor, and modifiers.',
    courier: 'Discards 2 hand cards to the graveyard when played. Single use per run.',
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
