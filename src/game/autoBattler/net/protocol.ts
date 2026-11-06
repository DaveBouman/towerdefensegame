import type { LockedBattle, PlayerShopState, RunPhase, Team } from '../types';

/** What the client is allowed to see (enemy shop/gold hidden). */
export interface ClientRunView {
    mode: 'menu' | 'vs_ai' | 'pvp';
    seed: string;
    phase: RunPhase;
    player: PlayerShopState;
    /** Enemy team only — never enemy shop/offers/gold. */
    enemyTeam: Team;
    battle: LockedBattle | null;
    lastMessage: string;
    matchId?: string;
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
    | { type: 'leave_run' };

export type ServerToClientMessage =
    | { type: 'welcome'; guestId: string; serverTime: number }
    | { type: 'state'; run: ClientRunView }
    | { type: 'queued'; position: number }
    | { type: 'match_found'; matchId: string }
    | { type: 'error'; message: string };

export const DEFAULT_AB_WS_PORT = 8787;

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
