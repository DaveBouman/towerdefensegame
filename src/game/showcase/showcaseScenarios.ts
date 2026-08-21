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
    | 'boss';

export interface ShowcaseBoardCard {
    row: number;
    col: number;
    definitionId: string;
    arrow?: CardDirection;
    loopArrow?: CardDirection;
}

/**
 * Mid-grid showcase chain for ?capture=board.
 *
 * Row 2 corridor: boost → fire → strike → defend → leap↑ (skips row 1 col 4)
 * Top row back:   cinder ← echo ← glitch ← corner↓
 * Hook landing:   redline → thorns → rupture
 *
 *     .   corner← glitch← echo← cinder
 *   redline→ thorns→ rupture  .   (gap)
 *   START→ fire→ strike→ defend→ leap↑
 */
export const SHOWCASE_FULL_BOARD: ShowcaseBoardCard[] = [
    { row: 2, col: 0, definitionId: 'boost', arrow: 'right' },
    { row: 2, col: 1, definitionId: 'fire', arrow: 'right' },
    { row: 2, col: 2, definitionId: 'attack-special', arrow: 'right' },
    { row: 2, col: 3, definitionId: 'defend', arrow: 'right' },
    { row: 2, col: 4, definitionId: 'attack-leap', arrow: 'up' },
    { row: 0, col: 4, definitionId: 'cinder', arrow: 'left' },
    { row: 0, col: 3, definitionId: 'echo', arrow: 'left' },
    { row: 0, col: 2, definitionId: 'glitch', arrow: 'left' },
    { row: 0, col: 1, definitionId: 'corner-strike', arrow: 'down' },
    { row: 1, col: 0, definitionId: 'redline', arrow: 'right' },
    { row: 1, col: 1, definitionId: 'thorns', arrow: 'right' },
    { row: 1, col: 2, definitionId: 'rupture', arrow: 'right' },
];

/** Hand still visible while the board is pre-filled for capture. */
export const SHOWCASE_HAND_CARDS: readonly {
    definitionId: string;
    arrow?: CardDirection;
    loopArrow?: CardDirection;
}[] = [
    { definitionId: 'poison', arrow: 'right' },
    { definitionId: 'defend-leap', arrow: 'down' },
    { definitionId: 'hardwire', arrow: 'right' },
    { definitionId: 'overclock', arrow: 'left' },
    { definitionId: 'surge', arrow: 'up' },
    { definitionId: 'corner-defense', arrow: 'right' },
];

export const SHOWCASE_BOARD_CHAIN_START = { row: 2, col: 0 };

export const showcasePuzzleMode = (): PuzzleModeConfig => ({
    handCards: [ ...SHOWCASE_HAND_CARDS ],
    boardCards: SHOWCASE_FULL_BOARD,
    chainStart: SHOWCASE_BOARD_CHAIN_START,
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
        'board', 'combo', 'map', 'shop', 'reward', 'bodymod', 'multi', 'event', 'rest', 'boss',
    ];

    return ids.includes(raw as ShowcaseCaptureId) ? raw as ShowcaseCaptureId : null;
};
