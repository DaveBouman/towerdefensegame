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
import { createEmptyTeam } from '../src/game/autoBattler/shared/emptyShop';
import { cloneTeam } from '../src/game/autoBattler/unitRegistry';
import type { LockedBattle, PlayerShopState, Team } from '../src/game/autoBattler/types';
import {
    buildClientBattleRemapped,
    buildClientRunView,
    emptyClientRunView,
} from '../src/game/autoBattler/serverOnly/buildClientView';

/**
 * Async PvP (SAP-style):
 * - You submit a team for Turn N.
 * - You fight a *snapshot* of someone else's Turn N team.
 * - That does NOT force them to fight you — they get their own opponent when ready.
 * - Rematch last = fight a stored ghost of their last lineup (no invite).
 */

interface TurnSubmission {
    guestId: string;
    team: Team;
}

export interface PlayerSocket {
    guestId: string;
    ws: WebSocket;
    run: AutoBattlerRunState | null;
    mode: 'menu' | 'vs_ai' | 'pvp';
    pvpShop: PlayerShopState | null;
    pvpSeed: string;
    pvpPhase: 'shop' | 'waiting' | 'battle' | 'victory' | 'defeat';
    pvpBattle: LockedBattle | null;
    lastMessage: string;
    /** Ghost team from the last battle you fought (for async rematch). */
    lastOpponentTeam: Team | null;
    /** If set, next End Turn fights this ghost instead of the pool. */
    pendingGhostTeam: Team | null;
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
    /** Turn → submitted lineups available as async opponents. */
    private readonly turnPools = new Map<number, TurnSubmission[]>();
    private battleCounter = 1;

    connect (ws: WebSocket): PlayerSocket
    {
        const guestId = createGuestId();
        const player = this.blankPlayer(guestId, ws);
        this.players.set(guestId, player);
        this.bySocket.set(ws, guestId);
        welcome(ws, guestId);
        send(ws, { type: 'state', run: emptyClientRunView() });

        return player;
    }

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

            if (prior.ws !== ws && prior.ws.readyState === 1)
            {
                welcome(ws, current.guestId);
                this.pushState(current);

                return;
            }

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

        this.removeSubmissions(guestId);
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

    private blankPlayer (guestId: string, ws: WebSocket): PlayerSocket
    {
        return {
            guestId,
            ws,
            run: null,
            mode: 'menu',
            pvpShop: null,
            pvpSeed: '',
            pvpPhase: 'shop',
            pvpBattle: null,
            lastMessage: '',
            lastOpponentTeam: null,
            pendingGhostTeam: null,
        };
    }

    private dispatch (player: PlayerSocket, message: ClientToServerMessage): void
    {
        switch (message.type)
        {
            case 'start_vs_ai':
                this.startVsAi(player);
                break;
            case 'queue_pvp':
                this.startPvpRun(player, null);
                break;
            case 'cancel_queue':
                this.cancelPvpWaitOrLeave(player);
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
            case 'rematch_last':
                this.rematchLastGhost(player);
                break;
            default:
                send(player.ws, { type: 'error', message: 'Unknown message.' });
        }
    }

    private startVsAi (player: PlayerSocket): void
    {
        this.removeSubmissions(player.guestId);
        player.mode = 'vs_ai';
        player.pvpShop = null;
        player.pvpBattle = null;
        player.pendingGhostTeam = null;
        player.run = startRun();
        this.pushState(player);
    }

    private startPvpRun (player: PlayerSocket, ghostTeam: Team | null): void
    {
        this.removeSubmissions(player.guestId);
        player.mode = 'pvp';
        player.run = null;
        player.pvpSeed = `PVP-${player.guestId}-${Date.now()}`;
        player.pvpShop = startNewRunShop(player.pvpSeed);
        player.pvpPhase = 'shop';
        player.pvpBattle = null;
        player.pendingGhostTeam = ghostTeam ? cloneTeam(ghostTeam) : null;
        player.lastMessage = ghostTeam
            ? 'Rematch — Turn 1 shop. End turn to fight their last lineup (they are not notified).'
            : 'Turn 1 shop. End turn to fight another Turn 1 lineup (async).';
        this.pushState(player);
    }

    /** Async rematch: fight a stored ghost. No invite. */
    private rematchLastGhost (player: PlayerSocket): void
    {
        if (player.mode !== 'pvp' || player.pvpPhase !== 'defeat')
        {
            send(player.ws, { type: 'error', message: 'Rematch is only available after a loss.' });

            return;
        }

        if (!player.lastOpponentTeam)
        {
            send(player.ws, { type: 'error', message: 'No last lineup to rematch.' });

            return;
        }

        this.startPvpRun(player, player.lastOpponentTeam);
    }

    private cancelPvpWaitOrLeave (player: PlayerSocket): void
    {
        if (player.mode === 'pvp' && player.pvpPhase === 'waiting')
        {
            this.removeSubmissions(player.guestId);
            player.pvpPhase = 'shop';
            player.lastMessage = 'Left the matchmaking pool. Shop again, then End turn.';
            this.pushState(player);

            return;
        }

        this.leaveRun(player);
    }

    private shopAction (
        player: PlayerSocket,
        mutate: (run: AutoBattlerRunState) => AutoBattlerRunState,
    ): void
    {
        if (player.mode === 'pvp')
        {
            if (!player.pvpShop || player.pvpPhase !== 'shop')
            {
                send(player.ws, { type: 'error', message: 'Not in shop phase.' });

                return;
            }

            const stub: AutoBattlerRunState = {
                ...createMenuState(),
                seed: player.pvpSeed,
                phase: 'shop',
                player: player.pvpShop,
            };
            player.pvpShop = mutate(stub).player;
            this.pushState(player);

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
        if (player.mode === 'pvp')
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
        if (player.mode === 'pvp')
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
        this.removeSubmissions(player.guestId);
        player.mode = 'menu';
        player.run = null;
        player.pvpShop = null;
        player.pvpBattle = null;
        player.pvpPhase = 'shop';
        player.pendingGhostTeam = null;
        player.lastMessage = '';
        send(player.ws, { type: 'state', run: emptyClientRunView() });
    }

    private pvpEndTurn (player: PlayerSocket): void
    {
        if (!player.pvpShop || player.pvpPhase !== 'shop')
        {
            send(player.ws, { type: 'error', message: 'Not in shop phase.' });

            return;
        }

        const turn = player.pvpShop.turn;
        const myTeam = cloneTeam(player.pvpShop.team);

        // Rematch ghost — fight immediately, no pool / no invite.
        if (player.pendingGhostTeam)
        {
            const ghost = cloneTeam(player.pendingGhostTeam);
            player.pendingGhostTeam = null;
            this.startOneWayBattle(player, ghost, turn, true);
            return;
        }

        this.upsertSubmission(turn, player.guestId, myTeam);
        player.pvpPhase = 'waiting';
        player.lastMessage = `Waiting for a Turn ${turn} lineup to fight…`;
        this.pushState(player);

        const pool = this.turnPools.get(turn) ?? [];
        send(player.ws, {
            type: 'queued',
            position: pool.length,
            turn,
        });

        this.tryAssignOneWayBattles(turn);
    }

    private upsertSubmission (turn: number, guestId: string, team: Team): void
    {
        const pool = this.turnPools.get(turn) ?? [];
        const existing = pool.findIndex((entry) => entry.guestId === guestId);

        if (existing >= 0)
        {
            pool[existing] = { guestId, team: cloneTeam(team) };
        }
        else
        {
            pool.push({ guestId, team: cloneTeam(team) });
        }

        this.turnPools.set(turn, pool);
    }

    private removeSubmissions (guestId: string): void
    {
        for (const [ turn, pool ] of this.turnPools)
        {
            const next = pool.filter((entry) => entry.guestId !== guestId);

            if (next.length === 0)
            {
                this.turnPools.delete(turn);
            }
            else
            {
                this.turnPools.set(turn, next);
            }
        }
    }

    /**
     * For each waiting player on this turn, assign a one-way battle against
     * someone else's submitted snapshot. The snapshot owner is not pulled in.
     */
    private tryAssignOneWayBattles (turn: number): void
    {
        const pool = this.turnPools.get(turn) ?? [];

        if (pool.length < 2)
        {
            return;
        }

        for (const entry of pool)
        {
            const player = this.players.get(entry.guestId);

            if (!player || player.mode !== 'pvp' || player.pvpPhase !== 'waiting' || !player.pvpShop)
            {
                continue;
            }

            const opponent = pool.find((other) => other.guestId !== entry.guestId);

            if (!opponent)
            {
                continue;
            }

            this.startOneWayBattle(player, opponent.team, turn, false);
        }
    }

    private startOneWayBattle (
        player: PlayerSocket,
        enemyTeam: Team,
        turn: number,
        isGhostRematch: boolean,
    ): void
    {
        const battleId = `T${turn}-B${this.battleCounter++}`;
        const battleSeed = `${player.pvpSeed}|${battleId}`;
        const myTeam = cloneTeam(player.pvpShop!.team);
        const foe = cloneTeam(enemyTeam);
        const result = simulateBattle(battleSeed, myTeam, foe);

        player.pvpBattle = {
            seed: battleSeed,
            playerTeam: myTeam,
            enemyTeam: foe,
            result,
        };
        player.lastOpponentTeam = foe;
        player.pvpPhase = 'battle';
        player.lastMessage = isGhostRematch
            ? `Rematch vs last lineup (Turn ${turn}).`
            : `Turn ${turn} battle vs a submitted lineup.`;

        send(player.ws, { type: 'match_found', matchId: battleId, turn });
        this.pushState(player);
    }

    private pvpBattleContinue (player: PlayerSocket): void
    {
        if (player.pvpPhase !== 'battle' || !player.pvpBattle || !player.pvpShop)
        {
            send(player.ws, { type: 'error', message: 'Not in battle phase.' });

            return;
        }

        const { result } = player.pvpBattle;
        // You are always side A in one-way battles.
        const won = result.winner === 'a';
        const lost = result.winner === 'b';
        let shop = { ...player.pvpShop };

        if (won)
        {
            shop = { ...shop, wins: shop.wins + 1 };
        }
        else if (lost)
        {
            const damage = livesLostOnDefeat(result.survivingB);
            shop = { ...shop, lives: Math.max(0, shop.lives - damage) };
        }

        const finishedTurn = shop.turn;
        player.pvpBattle = null;
        this.removeSubmissions(player.guestId);

        // Drop this player's finished-turn snapshot so they don't linger as bait forever
        // after advancing — already removed all; re-add others stay.
        const pool = this.turnPools.get(finishedTurn);

        if (pool)
        {
            const next = pool.filter((entry) => entry.guestId !== player.guestId);

            if (next.length === 0)
            {
                this.turnPools.delete(finishedTurn);
            }
            else
            {
                this.turnPools.set(finishedTurn, next);
            }
        }

        if (shop.wins >= AUTO_BATTLER_RULES.winsToVictory)
        {
            player.pvpShop = shop;
            player.pvpPhase = 'victory';
            player.lastMessage = 'Circuit cleared — 10 wins.';
            this.pushState(player);

            return;
        }

        if (shop.lives <= 0)
        {
            player.pvpShop = shop;
            player.pvpPhase = 'defeat';
            player.lastMessage = player.lastOpponentTeam
                ? 'Integrity depleted. Rematch their last lineup (async) or find a new opponent.'
                : 'Integrity depleted.';
            this.pushState(player);

            return;
        }

        const nextTurn = shop.turn + 1;
        shop = beginShopTurn(
            { ...shop, turn: nextTurn, lives: shop.lives, wins: shop.wins },
            player.pvpSeed,
        );
        player.pvpShop = { ...shop, lives: shop.lives, wins: shop.wins };
        player.pvpPhase = 'shop';
        player.lastMessage = `Turn ${nextTurn} shop. End turn to fight another Turn ${nextTurn} lineup.`;
        this.pushState(player);
    }

    private pushState (player: PlayerSocket): void
    {
        if (player.mode === 'pvp' && player.pvpShop)
        {
            send(player.ws, { type: 'state', run: this.pvpClientView(player) });

            return;
        }

        if (player.run)
        {
            send(player.ws, {
                type: 'state',
                run: buildClientRunView(player.run, 'vs_ai'),
            });

            return;
        }

        send(player.ws, { type: 'state', run: emptyClientRunView() });
    }

    private pvpClientView (player: PlayerSocket): ClientRunView
    {
        const shop = player.pvpShop!;
        const battle = player.pvpBattle
            ? buildClientBattleRemapped(player.pvpBattle, true)
            : null;
        const pool = this.turnPools.get(shop.turn) ?? [];
        const waitingMsg = player.pvpPhase === 'waiting'
            ? `Waiting for a Turn ${shop.turn} lineup… (${pool.length} submitted)`
            : player.lastMessage;

        return {
            mode: 'pvp',
            phase: player.pvpPhase,
            player: {
                ...shop,
                team: cloneTeam(shop.team),
                offers: shop.offers.map((offer) => ({ ...offer })),
            },
            enemyTeam: battle
                ? cloneTeam(battle.enemyTeam)
                : createEmptyTeam(AUTO_BATTLER_RULES.teamSize),
            battle,
            lastMessage: waitingMsg,
            canRematchLast: player.pvpPhase === 'defeat' && !!player.lastOpponentTeam,
        };
    }
}
