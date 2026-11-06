import type { WebSocket } from 'ws';
import {
    applyBuy,
    applyFreeze,
    applyMove,
    applyReroll,
    applySell,
    createMenuState,
    endTurnAndBattle,
    finishBattle,
    startRun,
    type AutoBattlerRunState,
} from '../src/game/autoBattler/run/AutoBattlerRun';
import { createGuestId } from './guestId';
import { toPublicRules } from '../src/game/autoBattler/shared/publicRules';
import type {
    ClientRunView,
    ClientToServerMessage,
    ServerToClientMessage,
} from '../src/game/autoBattler/shared/protocol';
import { beginShopTurn, startNewRunShop } from '../src/game/autoBattler/shop';
import { simulateBattle } from '../src/game/autoBattler/battle/simulateBattle';
import { AUTO_BATTLER_RULES, livesLostOnDefeat } from '../src/game/autoBattler/config/rules';
import { cloneTeam } from '../src/game/autoBattler/unitRegistry';
import type { LockedBattle, PlayerShopState } from '../src/game/autoBattler/types';
import {
    buildClientBattleRemapped,
    buildClientRunView,
    emptyClientRunView,
} from '../src/game/autoBattler/serverOnly/buildClientView';

export interface PlayerSocket {
    guestId: string;
    ws: WebSocket;
    run: AutoBattlerRunState | null;
    mode: 'menu' | 'vs_ai' | 'pvp';
    matchId: string | null;
    queued: boolean;
    /** PvP: locked shop for this turn. */
    locked: boolean;
    /** PvP: acknowledged battle playback. */
    battleAck: boolean;
}

interface PvpMatch {
    id: string;
    seed: string;
    playerA: string;
    playerB: string;
    turn: number;
    shopA: PlayerShopState;
    shopB: PlayerShopState;
    phase: 'shop' | 'battle' | 'victory_a' | 'victory_b';
    battle: LockedBattle | null;
    livesA: number;
    livesB: number;
    winsA: number;
    winsB: number;
}

const send = (ws: WebSocket, message: ServerToClientMessage): void =>
{
    if (ws.readyState === ws.OPEN)
    {
        ws.send(JSON.stringify(message));
    }
};

const welcome = (ws: WebSocket, guestId: string): void =>
{
    send(ws, {
        type: 'welcome',
        guestId,
        serverTime: Date.now(),
        rules: toPublicRules(AUTO_BATTLER_RULES),
    });
};

export class SessionStore
{
    private readonly players = new Map<string, PlayerSocket>();
    private readonly bySocket = new Map<WebSocket, string>();
    private readonly queue: string[] = [];
    private readonly matches = new Map<string, PvpMatch>();
    private matchCounter = 1;

    connect (ws: WebSocket): PlayerSocket
    {
        const guestId = createGuestId();
        const player: PlayerSocket = {
            guestId,
            ws,
            run: null,
            mode: 'menu',
            matchId: null,
            queued: false,
            locked: false,
            battleAck: false,
        };

        this.players.set(guestId, player);
        this.bySocket.set(ws, guestId);
        welcome(ws, guestId);
        send(ws, { type: 'state', run: emptyClientRunView() });

        return player;
    }

    /**
     * Prefer reclaiming a stored guest id when the previous socket is dead.
     * Never let two live sockets share one guest (anti-session-hijack lite).
     */
    hello (ws: WebSocket, requestedGuestId?: string): void
    {
        const currentId = this.bySocket.get(ws);
        const current = currentId ? this.players.get(currentId) : undefined;

        if (!current)
        {
            send(ws, { type: 'error', message: 'Not connected.' });

            return;
        }

        if (
            requestedGuestId
            && requestedGuestId !== current.guestId
            && this.players.has(requestedGuestId)
        )
        {
            const prior = this.players.get(requestedGuestId)!;

            if (prior.ws !== ws && prior.ws.readyState === prior.ws.OPEN)
            {
                welcome(ws, current.guestId);
                this.pushState(current);

                return;
            }

            // Reclaim idle guest session onto this socket.
            this.players.delete(current.guestId);
            this.bySocket.set(ws, requestedGuestId);
            prior.ws = ws;
            prior.guestId = requestedGuestId;
            welcome(ws, requestedGuestId);
            this.pushState(prior);

            return;
        }

        welcome(ws, current.guestId);
        this.pushState(current);
    }

    disconnect (ws: WebSocket): void
    {
        const guestId = this.bySocket.get(ws);

        if (!guestId)
        {
            return;
        }

        this.leaveQueue(guestId);
        const player = this.players.get(guestId);

        if (player?.matchId)
        {
            this.abortMatch(player.matchId, guestId);
        }

        this.players.delete(guestId);
        this.bySocket.delete(ws);
    }

    handle (ws: WebSocket, message: ClientToServerMessage): void
    {
        if (message.type === 'hello')
        {
            this.hello(ws, message.guestId);

            return;
        }

        const guestId = this.bySocket.get(ws);
        const player = guestId ? this.players.get(guestId) : undefined;

        if (!player)
        {
            send(ws, { type: 'error', message: 'Not connected.' });

            return;
        }

        try
        {
            this.dispatch(player, message);
        }
        catch (error)
        {
            const text = error instanceof Error ? error.message : 'Server error';
            send(ws, { type: 'error', message: text });
        }
    }

    private dispatch (player: PlayerSocket, message: ClientToServerMessage): void
    {
        switch (message.type)
        {
            case 'start_vs_ai':
                this.startVsAi(player);
                break;
            case 'queue_pvp':
                this.enqueue(player);
                break;
            case 'cancel_queue':
                this.leaveQueue(player.guestId);
                send(player.ws, { type: 'state', run: emptyClientRunView() });
                break;
            case 'shop_buy':
                this.shopAction(player, (run) => applyBuy(run, message.offerUid));
                break;
            case 'shop_sell':
                this.shopAction(player, (run) => applySell(run, message.unitUid));
                break;
            case 'shop_reroll':
                this.shopAction(player, (run) => applyReroll(run));
                break;
            case 'shop_freeze':
                this.shopAction(player, (run) => applyFreeze(run, message.offerUid));
                break;
            case 'shop_move':
                this.shopAction(player, (run) => applyMove(run, message.from, message.to));
                break;
            case 'end_turn':
                this.endTurn(player);
                break;
            case 'battle_continue':
                this.battleContinue(player);
                break;
            case 'leave_run':
                this.leaveRun(player);
                break;
            default:
                send(player.ws, { type: 'error', message: 'Unknown message.' });
        }
    }

    private startVsAi (player: PlayerSocket): void
    {
        this.leaveQueue(player.guestId);

        if (player.matchId)
        {
            this.abortMatch(player.matchId, player.guestId);
        }

        player.mode = 'vs_ai';
        player.matchId = null;
        player.locked = false;
        player.battleAck = false;
        player.run = startRun();
        this.pushState(player);
    }

    private shopAction (
        player: PlayerSocket,
        mutate: (run: AutoBattlerRunState) => AutoBattlerRunState,
    ): void
    {
        if (player.mode === 'pvp' && player.matchId)
        {
            this.pvpShopAction(player, mutate);

            return;
        }

        if (!player.run || player.run.phase !== 'shop')
        {
            send(player.ws, { type: 'error', message: 'Not in shop phase.' });

            return;
        }

        player.run = mutate(player.run);
        this.pushState(player);
    }

    private endTurn (player: PlayerSocket): void
    {
        if (player.mode === 'pvp' && player.matchId)
        {
            this.pvpEndTurn(player);

            return;
        }

        if (!player.run || player.run.phase !== 'shop')
        {
            send(player.ws, { type: 'error', message: 'Not in shop phase.' });

            return;
        }

        player.run = endTurnAndBattle(player.run);
        this.pushState(player);
    }

    private battleContinue (player: PlayerSocket): void
    {
        if (player.mode === 'pvp' && player.matchId)
        {
            this.pvpBattleContinue(player);

            return;
        }

        if (!player.run || player.run.phase !== 'battle')
        {
            send(player.ws, { type: 'error', message: 'Not in battle phase.' });

            return;
        }

        player.run = finishBattle(player.run);
        this.pushState(player);
    }

    private leaveRun (player: PlayerSocket): void
    {
        if (player.matchId)
        {
            this.abortMatch(player.matchId, player.guestId);
        }

        this.leaveQueue(player.guestId);
        player.mode = 'menu';
        player.run = null;
        player.matchId = null;
        player.locked = false;
        player.battleAck = false;
        send(player.ws, { type: 'state', run: emptyClientRunView() });
    }

    private pushState (player: PlayerSocket): void
    {
        if (player.mode === 'pvp' && player.matchId)
        {
            const match = this.matches.get(player.matchId);

            if (match)
            {
                send(player.ws, { type: 'state', run: this.pvpClientView(match, player.guestId) });

                return;
            }
        }

        if (!player.run)
        {
            send(player.ws, { type: 'state', run: emptyClientRunView() });

            return;
        }

        send(player.ws, {
            type: 'state',
            run: buildClientRunView(
                player.run,
                player.mode === 'vs_ai' ? 'vs_ai' : 'menu',
                player.matchId ?? undefined,
            ),
        });
    }

    private enqueue (player: PlayerSocket): void
    {
        if (player.queued || player.mode === 'vs_ai' || player.matchId)
        {
            return;
        }

        player.queued = true;
        this.queue.push(player.guestId);
        send(player.ws, { type: 'queued', position: this.queue.length });

        while (this.queue.length >= 2)
        {
            const a = this.queue.shift()!;
            const b = this.queue.shift()!;
            const pa = this.players.get(a);
            const pb = this.players.get(b);

            if (!pa || !pb)
            {
                if (pa)
                {
                    this.queue.unshift(a);
                }

                if (pb)
                {
                    this.queue.unshift(b);
                }

                break;
            }

            this.createMatch(pa, pb);
        }
    }

    private leaveQueue (guestId: string): void
    {
        const player = this.players.get(guestId);

        if (player)
        {
            player.queued = false;
        }

        const index = this.queue.indexOf(guestId);

        if (index >= 0)
        {
            this.queue.splice(index, 1);
        }
    }

    private createMatch (a: PlayerSocket, b: PlayerSocket): void
    {
        a.queued = false;
        b.queued = false;
        const id = `M${this.matchCounter++}`;
        const seed = `PVP-${id}`;

        const match: PvpMatch = {
            id,
            seed,
            playerA: a.guestId,
            playerB: b.guestId,
            turn: 1,
            shopA: startNewRunShop(`${seed}:a`),
            shopB: startNewRunShop(`${seed}:b`),
            phase: 'shop',
            battle: null,
            livesA: AUTO_BATTLER_RULES.startingLives,
            livesB: AUTO_BATTLER_RULES.startingLives,
            winsA: 0,
            winsB: 0,
        };

        this.matches.set(id, match);
        for (const p of [ a, b ])
        {
            p.mode = 'pvp';
            p.matchId = id;
            p.locked = false;
            p.battleAck = false;
            p.run = null;
        }

        send(a.ws, { type: 'match_found', matchId: id });
        send(b.ws, { type: 'match_found', matchId: id });
        this.pushState(a);
        this.pushState(b);
    }

    private pvpShopOf (match: PvpMatch, guestId: string): PlayerShopState
    {
        return guestId === match.playerA ? match.shopA : match.shopB;
    }

    private pvpSetShop (match: PvpMatch, guestId: string, shop: PlayerShopState): void
    {
        if (guestId === match.playerA)
        {
            match.shopA = shop;
        }
        else
        {
            match.shopB = shop;
        }
    }

    private pvpShopAction (
        player: PlayerSocket,
        mutate: (run: AutoBattlerRunState) => AutoBattlerRunState,
    ): void
    {
        const match = player.matchId ? this.matches.get(player.matchId) : undefined;

        if (!match || match.phase !== 'shop' || player.locked)
        {
            send(player.ws, { type: 'error', message: 'Cannot edit shop now.' });

            return;
        }

        const shop = this.pvpShopOf(match, player.guestId);
        const stub: AutoBattlerRunState = {
            ...createMenuState(),
            seed: match.seed,
            phase: 'shop',
            player: shop,
        };
        const next = mutate(stub);
        this.pvpSetShop(match, player.guestId, next.player);
        this.pushState(player);
    }

    private pvpEndTurn (player: PlayerSocket): void
    {
        const match = player.matchId ? this.matches.get(player.matchId) : undefined;

        if (!match || match.phase !== 'shop')
        {
            send(player.ws, { type: 'error', message: 'Not in shop phase.' });

            return;
        }

        player.locked = true;
        const a = this.players.get(match.playerA);
        const b = this.players.get(match.playerB);

        if (!a?.locked || !b?.locked)
        {
            this.pushState(player);
            const other = player.guestId === match.playerA ? b : a;

            if (other)
            {
                this.pushState(other);
            }

            return;
        }

        const battleSeed = `${match.seed}:battle:${match.turn}`;
        match.battle = {
            seed: battleSeed,
            playerTeam: cloneTeam(match.shopA.team),
            enemyTeam: cloneTeam(match.shopB.team),
            result: simulateBattle(
                battleSeed,
                cloneTeam(match.shopA.team),
                cloneTeam(match.shopB.team),
            ),
        };
        match.phase = 'battle';
        a.locked = false;
        b.locked = false;
        a.battleAck = false;
        b.battleAck = false;
        this.pushState(a);
        this.pushState(b);
    }

    private pvpBattleContinue (player: PlayerSocket): void
    {
        const match = player.matchId ? this.matches.get(player.matchId) : undefined;

        if (!match)
        {
            send(player.ws, { type: 'error', message: 'No active match.' });

            return;
        }

        if (match.phase !== 'battle' || !match.battle)
        {
            this.pushState(player);

            return;
        }

        player.battleAck = true;
        const a = this.players.get(match.playerA);
        const b = this.players.get(match.playerB);

        if (!a?.battleAck || !b?.battleAck)
        {
            if (a)
            {
                this.pushState(a);
            }

            if (b)
            {
                this.pushState(b);
            }

            return;
        }

        const { result } = match.battle;

        if (result.winner === 'a')
        {
            match.winsA += 1;
            match.livesB = Math.max(0, match.livesB - livesLostOnDefeat(result.survivingA));
        }
        else if (result.winner === 'b')
        {
            match.winsB += 1;
            match.livesA = Math.max(0, match.livesA - livesLostOnDefeat(result.survivingB));
        }

        a.battleAck = false;
        b.battleAck = false;

        if (match.winsA >= AUTO_BATTLER_RULES.winsToVictory || match.livesB <= 0)
        {
            match.phase = 'victory_a';
            match.battle = null;
        }
        else if (match.winsB >= AUTO_BATTLER_RULES.winsToVictory || match.livesA <= 0)
        {
            match.phase = 'victory_b';
            match.battle = null;
        }
        else
        {
            match.turn += 1;
            match.shopA = beginShopTurn(
                { ...match.shopA, turn: match.turn, lives: match.livesA, wins: match.winsA },
                `${match.seed}:a`,
            );
            match.shopB = beginShopTurn(
                { ...match.shopB, turn: match.turn, lives: match.livesB, wins: match.winsB },
                `${match.seed}:b`,
            );
            match.shopA = { ...match.shopA, lives: match.livesA, wins: match.winsA };
            match.shopB = { ...match.shopB, lives: match.livesB, wins: match.winsB };
            match.phase = 'shop';
            match.battle = null;
        }

        this.pushState(a);
        this.pushState(b);
    }

    private pvpClientView (match: PvpMatch, guestId: string): ClientRunView
    {
        const isA = guestId === match.playerA;
        const selfShop = isA ? match.shopA : match.shopB;
        const foeShop = isA ? match.shopB : match.shopA;
        const selfWins = isA ? match.winsA : match.winsB;
        const selfLives = isA ? match.livesA : match.livesB;
        const foeWins = isA ? match.winsB : match.winsA;
        const foeLives = isA ? match.livesB : match.livesA;
        const self = this.players.get(guestId);

        let phase: ClientRunView['phase'] = 'shop';
        let lastMessage = `PvP turn ${match.turn}. Opponent ${foeWins}W / ${foeLives}♥`;

        if (match.phase === 'battle')
        {
            phase = 'battle';
            lastMessage = self?.battleAck
                ? 'Waiting for opponent to continue…'
                : 'Battle resolving…';
        }
        else if (match.phase === 'victory_a')
        {
            phase = isA ? 'victory' : 'defeat';
            lastMessage = isA ? 'You won the match.' : 'You lost the match.';
        }
        else if (match.phase === 'victory_b')
        {
            phase = isA ? 'defeat' : 'victory';
            lastMessage = isA ? 'You lost the match.' : 'You won the match.';
        }
        else if (self?.locked)
        {
            lastMessage = 'Locked in — waiting for opponent…';
        }

        return {
            mode: 'pvp',
            phase,
            player: {
                ...selfShop,
                lives: selfLives,
                wins: selfWins,
                team: cloneTeam(selfShop.team),
                offers: selfShop.offers.map((offer) => ({ ...offer })),
            },
            enemyTeam: cloneTeam(foeShop.team),
            battle: match.battle ? buildClientBattleRemapped(match.battle, isA) : null,
            lastMessage,
            matchId: match.id,
        };
    }

    private abortMatch (matchId: string, leaverId: string): void
    {
        const match = this.matches.get(matchId);

        if (!match)
        {
            return;
        }

        this.matches.delete(matchId);
        const otherId = match.playerA === leaverId ? match.playerB : match.playerA;
        const other = this.players.get(otherId);

        if (other)
        {
            other.matchId = null;
            other.mode = 'menu';
            other.locked = false;
            other.battleAck = false;
            send(other.ws, { type: 'error', message: 'Opponent disconnected.' });
            send(other.ws, { type: 'state', run: emptyClientRunView() });
        }

        const leaver = this.players.get(leaverId);

        if (leaver)
        {
            leaver.matchId = null;
            leaver.mode = 'menu';
            leaver.locked = false;
            leaver.battleAck = false;
        }
    }
}
