import { archetypeLabel, poisonStatusNameLower } from '../copy/strings';
import { pickWeighted } from '../random/rng';
import { getCardDefinitionOrThrow, type CardTier } from '../cardGame/config/cardRegistry';
import { getCardRewardWeight, scoreDeckArchetypes } from './deckArchetypes';
import type { BodyModRewardPool } from './bodyMods';
import type { RunMapNodeKind } from './nodeKinds';

/**
 * Rewards granted for defeating an enemy. Kept as a discriminated union so new
 * reward kinds (e.g. body mods, creds) can be added without touching existing
 * handling. Body mods modify the numeric knobs below (e.g. raise
 * `pickCount` to "pick two", or flag a reward as rerollable).
 */
export type RewardPoolId = 'standard' | 'elite';

export interface CardReward {
    kind: 'card';
    /** How many card choices to present. */
    choiceCount: number;
    /** How many of the presented cards the player keeps. */
    pickCount: number;
    /** Whether the player may reroll the offered choices (body-mod-driven). */
    rerollable: boolean;
    /** Which card pool to draw offers from. */
    pool?: RewardPoolId;
}

export interface BodyModRunReward {
    kind: 'body-mod';
    /** Which body mod pool to draw from. */
    pool?: BodyModRewardPool;
}

export interface CompoundRunReward {
    kind: 'compound';
    steps: RunReward[];
}

export type RunReward = CardReward | BodyModRunReward | CompoundRunReward;

export const DEFAULT_CARD_REWARD: CardReward = {
    kind: 'card',
    choiceCount: 3,
    pickCount: 1,
    rerollable: false,
    pool: 'standard',
};

/** Lieutenant / semi-boss: elite card pool, same 3-pick-1 flow. */
export const SEMI_BOSS_CARD_REWARD: CardReward = {
    kind: 'card',
    choiceCount: 3,
    pickCount: 1,
    rerollable: false,
    pool: 'elite',
};

/** Lieutenant / semi-boss: elite card pick, then a body mod. */
export const SEMI_BOSS_REWARD: CompoundRunReward = {
    kind: 'compound',
    steps: [
        {
            kind: 'card',
            choiceCount: 3,
            pickCount: 1,
            rerollable: false,
            pool: 'elite',
        },
        {
            kind: 'body-mod',
            pool: 'lieutenant',
        },
    ],
};

/** Warden: unique Gatekeeper Seal body mod. */
export const WARDEN_BODY_MOD_REWARD: BodyModRunReward = {
    kind: 'body-mod',
    pool: 'warden',
};

/** Resolves the battle reward template for a map node kind. */
export const rewardForNodeKind = (kind: RunMapNodeKind): RunReward | undefined =>
{
    if (kind === 'boss')
    {
        return { ...WARDEN_BODY_MOD_REWARD };
    }

    if (kind === 'semi-boss')
    {
        return {
            kind: 'compound',
            steps: SEMI_BOSS_REWARD.steps.map((step) => ({ ...step })),
        };
    }

    if (kind === 'enemy')
    {
        return { ...DEFAULT_CARD_REWARD };
    }

    return undefined;
};

/** Flattens compound rewards into sequential steps for the reward flow. */
export const flattenRunReward = (reward: RunReward): RunReward[] =>
{
    if (reward.kind === 'compound')
    {
        return reward.steps.flatMap((step) => flattenRunReward(step));
    }

    return [ reward ];
};

/** Shown on battle victory card rewards. */
export const BATTLE_REWARD_RULES: readonly string[] = [
    'Three cards are offered — biased toward your deck’s specialty, with higher tiers later in the run.',
    'Select one card to add to your deck, or take nothing and continue.',
    'Lieutenants also grant a body mod after you pick a card. The Warden grants a unique body mod.',
    'Upgrade copies at the Ripperdoc. Your choices are permanent for the rest of the run.',
];

/** Shown on combo-trial briefs and reward screens. */
export const PUZZLE_TRIAL_RULES: readonly string[] = [
    'You receive a fixed hand — place every card on the board.',
    'Click a column-0 tile to set chain start, then launch one attack.',
    'Deal at least the target damage in that single attack.',
    'The training dummy does not fight back.',
    'Pass: pick one reward card (or none). Fail: take damage.',
];

/** Base (unupgraded) cards eligible as battle rewards. */
export const REWARD_CARD_POOL: readonly string[] = [
    'attack',
    'defend',
    'attack-special',
    'attack-leap',
    'defend-special',
    'defend-leap',
    'joker',
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
    'switchback',
    'phase-relay',
    'phase-bulwark',
    'scorch',
    'bramble',
    'neurotoxin',
    'serration',
    'kindling',
    'black-ichor',
    'exsanguinate',
    'white-hot',
    'citadel',
    'execution',
    'amp-core',
    'glitch',
    'hardwire',
    'patch',
    'overclock',
    'echo',
    'salvage',
    'courier',
];

/** Higher-tier pool for lieutenants — skips basic attack/defend fillers. */
export const ELITE_REWARD_CARD_POOL: readonly string[] = [
    'attack-special',
    'attack-leap',
    'defend-special',
    'defend-leap',
    'joker',
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
    'switchback',
    'phase-relay',
    'phase-bulwark',
    'scorch',
    'bramble',
    'neurotoxin',
    'serration',
    'kindling',
    'black-ichor',
    'exsanguinate',
    'white-hot',
    'citadel',
    'execution',
    'amp-core',
    'glitch',
    'hardwire',
    'patch',
    'overclock',
    'echo',
    'salvage',
    'courier',
];

const poolForId = (poolId: RewardPoolId = 'standard'): readonly string[] =>
    poolId === 'elite' ? ELITE_REWARD_CARD_POOL : REWARD_CARD_POOL;

/** Relative weight for a card tier given the current floor (1–3). */
export const getCardTierOfferWeight = (tier: CardTier, floor: number): number =>
{
    const clampedFloor = Math.max(1, Math.min(3, Math.round(floor)));

    if (clampedFloor <= 1)
    {
        return tier === 1 ? 3.2 : tier === 2 ? 1.15 : 0.28;
    }

    if (clampedFloor === 2)
    {
        return tier === 1 ? 1.1 : tier === 2 ? 2.6 : 1.35;
    }

    return tier === 1 ? 0.45 : tier === 2 ? 1.55 : 3.4;
};

export interface RollCardRewardOptions {
    deckDefinitionIds?: readonly string[];
    /** Logical run floor (1–3). Higher floors favor higher card tiers. */
    floor?: number;
}

/**
 * Picks `choiceCount` distinct base card ids from the pool.
 * Biased by deck specialty and run floor (later → rarer / stronger).
 */
export const rollCardReward = (
    choiceCount: number,
    poolId: RewardPoolId = 'standard',
    deckOrOptions: readonly string[] | RollCardRewardOptions = [],
): string[] =>
{
    const options: RollCardRewardOptions = Array.isArray(deckOrOptions)
        ? { deckDefinitionIds: deckOrOptions }
        : deckOrOptions;
    const deckDefinitionIds = options.deckDefinitionIds ?? [];
    const floor = options.floor ?? 1;
    const pool = [ ...poolForId(poolId) ];
    const scores = scoreDeckArchetypes(deckDefinitionIds);
    const eliteBias = poolId === 'elite' ? 1.35 : 1;
    const picks: string[] = [];
    const count = Math.max(0, Math.min(choiceCount, pool.length));

    for (let index = 0; index < count; index++)
    {
        const remaining = pool.filter((id) => !picks.includes(id));

        if (remaining.length === 0)
        {
            break;
        }

        const pick = pickWeighted(remaining, (id) =>
        {
            const definition = getCardDefinitionOrThrow(id);
            const specialty = getCardRewardWeight(id, scores);
            const tierWeight = getCardTierOfferWeight(definition.tier, floor);
            const rareEliteBoost = poolId === 'elite' && definition.tier >= 3 ? eliteBias : 1;

            return specialty * tierWeight * rareEliteBoost;
        });

        picks.push(pick);
    }

    return picks;
};

const CARD_BLURBS: Record<string, string> = {
    attack: 'Deals damage to the enemy along the chain.',
    defend: 'Grants armor that soaks the next enemy hits.',
    poison: `Vents ${poisonStatusNameLower()} fumes — later defends stack ${poisonStatusNameLower()} that ticks each turn.`,
    fire: 'Ignites alternation — bonus damage on alternating steps.',
    joker: 'Wild link — choose its direction mid-chain.',
    rupture: 'Bleed — more damage the more attacks you chain.',
    bulwark: 'Fortify — more armor the more defends you chain.',
    surge: 'Overload — damage per skill card, doubled with a Reroute.',
    'corner-strike': 'Hooks around the corner to a forward-diagonal tile.',
    'corner-defense': 'Defend card that turns the corner to the next tile.',
    shiv: 'Diagonal bleed starter — rewards attack-heavy routes from the corners.',
    miasma: `Diagonal ${poisonStatusNameLower()} trail — angles your toxin through the grid.`,
    cinder: 'Diagonal fire — starts alternation chains from off-axis tiles.',
    lacerate: 'Lunge + bleed — skip a tile and stack attack bonuses.',
    scorch: 'Corner fire — hooks around a bend while igniting alternation.',
    bramble: 'Corner fortify — bends the chain while stacking defend bonuses.',
    neurotoxin: `Stronger ${poisonStatusNameLower()} trail — denser stacks on subsequent defends.`,
    'black-ichor': `Rare diagonal toxin — heavy ${poisonStatusNameLower()} payload from off-axis routes.`,
    serration: 'Bleed engine — fat attack that scales with long attack chains.',
    exsanguinate: 'Rare lunge bleed — skip a tile and tear open big bleed payoffs.',
    kindling: 'Hotter fire starter — stronger alternation fuel.',
    'white-hot': 'Rare corner fire — bend the chain while detonating alternation.',
    citadel: 'Rare fortify wall — big armor from long defend chains.',
    execution: 'Rare finish — huge hit, exhausts, heals hard on kill.',
    'amp-core': 'Rare overload core — pays off when the chain is packed with skills.',
    'phase-relay': 'Edge wrap — exits off the top/bottom/side continue on the opposite edge.',
    'phase-bulwark': 'Defend wrap — grants armor and continues the chain on the opposite edge.',
    glitch: 'Enemy attack -10% for the rest of the energy round (until energy refills).',
    hardwire: 'Shield gained +10% from defend cards and armor effects.',
    patch: 'Damage taken -10% from enemy attacks and reflect damage.',
    overclock: 'Damage dealt +10% from your attack steps and bonuses.',
    echo: 'Re-activates the previous chain card — repeats its damage, armor, and modifiers.',
    switchback: 'Deals double damage, then jumps your lock to the next living enemy.',
    salvage: 'Deals 4 damage. Exhausted after use this fight. Heals 7 HP if its damage kills an enemy.',
    courier: 'Discards 2 hand cards to the graveyard when played. Single use per run.',
};

export interface CardRewardDisplay {
    definitionId: string;
    label: string;
    power: number;
    blurb: string;
    tier: CardTier;
}

/** Resolves display data for a card offered as a reward. */
export const describeCardReward = (definitionId: string): CardRewardDisplay =>
{
    const definition = getCardDefinitionOrThrow(definitionId);
    const baseId = definition.upgradeOf ?? definitionId;

    return {
        definitionId,
        label: definition.label,
        power: definition.power,
        blurb: CARD_BLURBS[baseId] ?? definition.label,
        tier: definition.tier,
    };
};

const ARCHETYPE_LABELS: Record<string, string> = {
    blade: archetypeLabel('blade'),
    toxin: archetypeLabel('toxin'),
    heat: archetypeLabel('heat'),
    bulwark: archetypeLabel('bulwark'),
};

/** Player-facing synergy hint for a reward card given the current deck. */
export const getCardSynergyHint = (
    definitionId: string,
    deckDefinitionIds: readonly string[],
): string | null =>
{
    const scores = scoreDeckArchetypes(deckDefinitionIds);

    if (!scores.dominant)
    {
        return null;
    }

    const weight = getCardRewardWeight(definitionId, scores);
    const baseWeight = getCardRewardWeight('attack', scores);

    if (weight <= baseWeight * 1.05)
    {
        return null;
    }

    const label = ARCHETYPE_LABELS[scores.dominant] ?? scores.dominant;

    return `Reinforces your ${label} lane`;
};
