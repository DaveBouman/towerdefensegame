import type {
    BattleEvent,
    BattleResult,
    PlayerShopState,
    RunPhase,
    Team,
} from '../types';
import type { PublicRules } from './publicRules';

/** Battle snapshot for clients — no sim seed. */
export interface ClientLockedBattle {
    playerTeam: Team;
    enemyTeam: Team;
    result: BattleResult;
}

/** What the client is allowed to see (enemy shop/gold/seed hidden). */
export interface ClientRunView {
    mode: 'menu' | 'vs_ai' | 'pvp';
    phase: RunPhase;
    player: PlayerShopState;
    enemyTeam: Team;
    battle: ClientLockedBattle | null;
    lastMessage: string;
    matchId?: string;
    /** Defeat: rematch their last lineup as an async ghost (no invite). */
    canRematchLast?: boolean;
}

export type ClientToServerMessage =
    | { type: 'hello'; guestId?: string }
    | { type: 'start_vs_ai' }
    | { type: 'queue_pvp' }
    | { type: 'cancel_queue' }
    | { type: 'shop_buy'; offerUid: string }
    | { type: 'shop_sell'; unitUid: string }
    | { type: 'shop_reroll' }
    | { type: 'shop_freeze'; offerUid: string }
    | { type: 'shop_move'; from: number; to: number }
    | { type: 'end_turn' }
    | { type: 'battle_continue' }
    | { type: 'leave_run' }
    | { type: 'rematch_last' };

export type ServerToClientMessage =
    | { type: 'welcome'; guestId: string; serverTime: number; rules: PublicRules }
    | { type: 'state'; run: ClientRunView }
    | { type: 'queued'; position: number; turn: number }
    | { type: 'match_found'; matchId: string; turn: number }
    | { type: 'error'; message: string };

export const DEFAULT_AB_WS_PORT = 8787;

export const sanitizeBattleLog = (log: readonly BattleEvent[]): BattleEvent[] =>
    log.map((event) =>
    {
        if (event.type === 'start')
        {
            return { type: 'start', seed: '' };
        }

        return event;
    });

export const parseClientMessage = (raw: string): ClientToServerMessage | null =>
{
    try
    {
        const data = JSON.parse(raw) as ClientToServerMessage;

        if (!data || typeof data !== 'object' || typeof (data as { type?: unknown }).type !== 'string')
        {
            return null;
        }

        return data;
    }
    catch
    {
        return null;
    }
};
