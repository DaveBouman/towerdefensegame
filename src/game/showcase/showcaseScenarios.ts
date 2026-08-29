/**
 * Frozen setups for Steam screenshots and trailer frames.
 * Loaded via ?capture=<id> — see docs/steam-capture/README.md.
 */
import type { CardDirection } from '../cardGame/domain/cardDirections';
import type { PuzzleModeConfig } from '../cardGame/domain/CardGameSession';
import type { RunDeckCard } from '../run/runDeck';
import type { RunMapNode } from '../run/runMap';
import type { PendingRewardFlow } from '../../runController/types';
import type { VisitState } from '../../runController/types';
import { seedScope } from '../random/rng';
import { rollShopOffers } from '../run/shop';
import { buildRewardSteps } from '../../runController/rewardHelpers';
import { SEMI_BOSS_CARD_REWARD } from '../run/rewards';
import { getRunMaxHealth } from '../run/runResources';
import { buildDefaultRunDeck } from '../cardGame/domain/buildPlayerDeck';

export const STEAM_CAPTURE_SEED = 'STEAM-CAPTURE';

export type ShowcaseCaptureId =
    | 'board'
    | 'combo'
    | 'map'
    | 'shop'
    | 'reward'
    | 'bodymod'
    | 'multi'
    | 'event'
    | 'rest'
    | 'boss'
    | 'cardart';

export interface ShowcaseBoardCard {
    row: number;
    col: number;
    definitionId: string;
    arrow?: CardDirection;
    loopArrow?: CardDirection;
}

/**
 * Showcase routing for ?capture=board — dense but not a full fill.
 * Orthogonal open (Strike → Skewer pierce → Lunge), then a stack of
 * corner/diagonal fire into a Corner Strike hook, bleed corridor,
 * Lacerate leap + Phase Relay, Bramble corner into Amp Core / Shiv
 * diagonal climb, and Strike again. A couple off-chain diagonals dress
 * the center gaps.
 *
 *   hardwire↓  corner↙  echo←   scorch↙   white-hot↙
 *   redline→   switch→  glitch→ serration→ lacerate⇊
 *   START→     strike→  skewer⇉ defend     leap↑
 *   ·          miasma   shiv↖   ward-corner phase↓
 *   surge      amp↗     bramble↖ poison←   citadel
 */
export const SHOWCASE_FULL_BOARD: ShowcaseBoardCard[] = [
    // Row 2 — open: Strike once, Skewer pierces Defend, lands on Lunge
    { row: 2, col: 0, definitionId: 'boost', arrow: 'right' },
    { row: 2, col: 1, definitionId: 'attack-special', arrow: 'right' },
    { row: 2, col: 2, definitionId: 'skewer', arrow: 'right' },
    { row: 2, col: 3, definitionId: 'defend', arrow: 'right' },
    { row: 2, col: 4, definitionId: 'attack-leap', arrow: 'up' },
    // Row 0 — leap lands on White-Hot; corner stack into Corner Strike hook
    { row: 0, col: 4, definitionId: 'white-hot', arrow: 'down-left' },
    { row: 0, col: 3, definitionId: 'scorch', arrow: 'down-left' },
    { row: 0, col: 2, definitionId: 'echo', arrow: 'left' },
    { row: 0, col: 1, definitionId: 'corner-strike', arrow: 'down-left' },
    { row: 0, col: 0, definitionId: 'hardwire', arrow: 'down' },
    // Row 1 — bleed corridor, then Lacerate leap down
    { row: 1, col: 0, definitionId: 'redline', arrow: 'right' },
    { row: 1, col: 1, definitionId: 'switchback', arrow: 'right' },
    { row: 1, col: 2, definitionId: 'glitch', arrow: 'right' },
    { row: 1, col: 3, definitionId: 'serration', arrow: 'right' },
    { row: 1, col: 4, definitionId: 'lacerate', arrow: 'down' },
    // Row 3/4 — Phase Relay, Bramble corner, diagonal climb onto Strike again
    { row: 3, col: 4, definitionId: 'phase-relay', arrow: 'down' },
    { row: 4, col: 4, definitionId: 'citadel', arrow: 'left' },
    { row: 4, col: 3, definitionId: 'poison', arrow: 'left' },
    { row: 4, col: 2, definitionId: 'bramble', arrow: 'up-left' },
    { row: 4, col: 1, definitionId: 'amp-core', arrow: 'up-right' },
    { row: 3, col: 2, definitionId: 'shiv', arrow: 'up-left' },
    // Off-chain diagonal dress — variety in the gaps without packing the route
    { row: 3, col: 1, definitionId: 'miasma', arrow: 'up-right' },
    { row: 3, col: 3, definitionId: 'corner-defense', arrow: 'up-left' },
    { row: 4, col: 0, definitionId: 'surge', arrow: 'up-right' },
];

/** Cards the main chain is expected to walk (excludes off-chain dress cards). */
export const SHOWCASE_BOARD_CHAIN_IDS: readonly string[] = [
    'boost',
    'attack-special',
    'skewer',
    'defend',
    'attack-leap',
    'white-hot',
    'scorch',
    'echo',
    'corner-strike',
    'hardwire',
    'redline',
    'switchback',
    'glitch',
    'serration',
    'lacerate',
    'phase-relay',
    'citadel',
    'poison',
    'bramble',
    'amp-core',
    'shiv',
    'attack-special',
];
/** Hand still visible while the board is pre-filled for capture. */
export const SHOWCASE_HAND_CARDS: readonly {
    definitionId: string;
    arrow?: CardDirection;
    loopArrow?: CardDirection;
}[] = [
    { definitionId: 'overclock', arrow: 'left' },
    { definitionId: 'black-ichor', arrow: 'down-right' },
    { definitionId: 'cinder', arrow: 'down-left' },
    { definitionId: 'defend-special', arrow: 'up-right' },
    { definitionId: 'execution', arrow: 'left' },
    { definitionId: 'exsanguinate', arrow: 'right' },
];

export const SHOWCASE_BOARD_CHAIN_START = { row: 2, col: 0 };

/** Smokebinder on the board shot; inflated HP so Attack still plays the full route. */
export const SHOWCASE_BOARD_ENEMY_ID = 'smokebinder';
export const SHOWCASE_BOARD_ENEMY_HP_MULTIPLIER = 5;

export const showcasePuzzleMode = (): PuzzleModeConfig => ({
    handCards: [ ...SHOWCASE_HAND_CARDS ],
    boardCards: SHOWCASE_FULL_BOARD,
    chainStart: SHOWCASE_BOARD_CHAIN_START,
    damageTarget: 999,
});

/**
 * Portrait painted-front preview board — three Attacks in a row become a streak bar.
 * Open via http://localhost:8080/?capture=cardart
 *
 *   attack→  attack→  attack→  defend→  attack↓
 *   ·        ·        ·        ·        defend↓
 *   ·        ·        ·        ·        attack
 */
export const SHOWCASE_CARD_ART_BOARD: ShowcaseBoardCard[] = [
    { row: 0, col: 0, definitionId: 'attack', arrow: 'right' },
    { row: 0, col: 1, definitionId: 'attack', arrow: 'right' },
    { row: 0, col: 2, definitionId: 'attack', arrow: 'right' },
    { row: 0, col: 3, definitionId: 'defend', arrow: 'right' },
    { row: 0, col: 4, definitionId: 'attack', arrow: 'down' },
    { row: 1, col: 4, definitionId: 'defend', arrow: 'down' },
    { row: 2, col: 4, definitionId: 'attack', arrow: 'left' },
];

export const SHOWCASE_CARD_ART_HAND: readonly {
    definitionId: string;
    arrow?: CardDirection;
}[] = [
    { definitionId: 'attack', arrow: 'up' },
    { definitionId: 'attack', arrow: 'right' },
    { definitionId: 'attack', arrow: 'down' },
    { definitionId: 'defend', arrow: 'left' },
    { definitionId: 'attack-special', arrow: 'down-right' },
    { definitionId: 'defend-special', arrow: 'up-left' },
];

export const SHOWCASE_CARD_ART_CHAIN_START = { row: 0, col: 0 };

export const showcaseCardArtPuzzleMode = (): PuzzleModeConfig => ({
    handCards: [ ...SHOWCASE_CARD_ART_HAND ],
    boardCards: SHOWCASE_CARD_ART_BOARD,
    chainStart: SHOWCASE_CARD_ART_CHAIN_START,
    damageTarget: 999,
});

const mockShopNode: RunMapNode = {
    id: 'steam-capture-shop',
    row: 4,
    col: 0,
    colCount: 1,
    kind: 'shop',
    nextIds: [],
};

export const buildShowcaseShopVisit = (
    bodyMods: readonly string[],
    deckDefinitionIds: readonly string[],
): VisitState =>
{
    seedScope(STEAM_CAPTURE_SEED, `shop:${mockShopNode.id}`);

    return {
        node: mockShopNode,
        eventId: null,
        shopOffers: rollShopOffers([ ...bodyMods ], deckDefinitionIds, 2),
    };
};

export const buildShowcaseCardReward = (
    deckDefinitionIds: readonly string[],
): PendingRewardFlow =>
{
    const nodeId = 'steam-capture-reward';

    return {
        nodeId,
        nodeKind: 'semi-boss',
        steps: buildRewardSteps(
            STEAM_CAPTURE_SEED,
            nodeId,
            SEMI_BOSS_CARD_REWARD,
            deckDefinitionIds,
            2,
            [],
        ),
        stepIndex: 0,
    };
};

export const buildShowcaseDeck = (): RunDeckCard[] => buildDefaultRunDeck();

export const showcasePlayerHealth = (bodyMods: readonly string[]): number =>
    Math.max(1, Math.round(getRunMaxHealth(bodyMods) * 0.72));

export const showcaseGold = (): number => 420;

const ESSENTIAL_CAPTURE_IDS: readonly ShowcaseCaptureId[] = [
    'board',
    'combo',
    'map',
    'shop',
    'reward',
    'boss',
];

export const parseCaptureId = (raw: string | null): ShowcaseCaptureId | null =>
{
    if (!raw)
    {
        return null;
    }

    if (/^[1-6]$/.test(raw))
    {
        return ESSENTIAL_CAPTURE_IDS[Number(raw) - 1] ?? null;
    }

    const ids: ShowcaseCaptureId[] = [
        'board', 'combo', 'map', 'shop', 'reward', 'bodymod', 'multi', 'event', 'rest', 'boss', 'cardart',
    ];

    return ids.includes(raw as ShowcaseCaptureId) ? raw as ShowcaseCaptureId : null;
};
