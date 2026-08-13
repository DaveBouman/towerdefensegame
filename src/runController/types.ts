import type { AppliedEventMessage } from '../game/run/runEvents';
import type { BodyModRewardPool } from '../game/run/bodyMods';
import type { CardReward } from '../game/run/rewards';
import type { ShopOffer } from '../game/run/shop';
import type { RunMapNode } from '../game/run/runMap';
import { GAME_RULES } from '../game/cardGame/config/cardRegistry';

export type RunPhase =
    | 'menu'
    | 'map'
    | 'battle'
    | 'reward'
    | 'body-mod-reward'
    | 'visit'
    | 'puzzle'
    | 'puzzle-result'
    | 'puzzle-reward'
    | 'victory'
    | 'defeat';

export type RewardStep =
    | { kind: 'card'; reward: CardReward; options: string[]; rerollIndex: number }
    | { kind: 'body-mod'; pool: BodyModRewardPool; options: string[] };

export interface PendingRewardFlow {
    nodeId: string;
    nodeKind: import('../game/run/nodeKinds').RunMapNodeKind;
    steps: RewardStep[];
    stepIndex: number;
}

export interface VisitState {
    node: RunMapNode;
    eventId: string | null;
    shopOffers?: ShopOffer[];
}

export interface PuzzleResultState {
    puzzleId: string;
    success: boolean;
    damageDealt: number;
    damageTarget: number;
    messages: AppliedEventMessage[];
}

import type { RunDeckCard } from '../game/run/runDeck';

export interface PendingCardDirectionFlow {
    definitionIds: string[];
    /** Deck snapshot before applying direction picks (events). */
    mergedDeck?: RunDeckCard[];
    onApplied: () => void;
}

export interface PendingPuzzleReward {
    puzzleId: string;
    nodeId: string;
    options: string[];
    damageDealt: number;
    damageTarget: number;
    messages: AppliedEventMessage[];
}

export const MAX_HEALTH = GAME_RULES.player.maxHealth;

export interface CombatRecapLine {
    label: string;
    value: string;
    tone: 'good' | 'bad';
}
