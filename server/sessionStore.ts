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
 * Async match bank (SAP-style):
 * - End turn → your lineup is *saved* keyed by run depth (turn number).
 * - You only fight a random save from the *same* turn — never Turn 4 vs Turn 1.
 * - Saving your run does not make them fight you; others can pull your save later.
 * - Rematch = fight the stored ghost of the last lineup you faced (no invite).
 */

interface SavedLineup {
    id: string;
    turn: number;
    ownerGuestId: string;
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
    lastOpponentTeam: Team | null;
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

const pickRandom = <T>(items: readonly T[]): T | null =>
{
    if (items.length === 0)
    {
        return null;
    }

    return items[Math.floor(Math.random() * items.length)]!;
};

export class SessionStore
{
    private readonly players = new Map<string, PlayerSocket>();
    private readonly bySocket = new Map<WebSocket, string>();
    /** Saved lineups by turn — random opponents pull from here. */
    private readonly savedByTurn = new Map<number, SavedLineup[]>();
    private saveCounter = 1;
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

        // Keep their saved lineups in the bank so others can still fight them.
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
                this.cancelWaitOrLeave(player);
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
        player.mode = 'vs_ai';
        player.pvpShop = null;
        player.pvpBattle = null;
        player.pendingGhostTeam = null;
        player.run = startRun();
        this.pushState(player);
    }

    private startPvpRun (player: PlayerSocket, ghostTeam: Team | null): void
    {
        player.mode = 'pvp';
        player.run = null;
        player.pvpSeed = `PVP-${player.guestId}-${Date.now()}`;
        player.pvpShop = startNewRunShop(player.pvpSeed);
        player.pvpPhase = 'shop';
        player.pvpBattle = null;
        player.pendingGhostTeam = ghostTeam ? cloneTeam(ghostTeam) : null;
        player.lastMessage = ghostTeam
            ? 'Rematch — Turn 1 shop. End turn to fight their saved lineup (async ghost).'
            : 'Turn 1 shop. End turn to save your run and fight a random saved opponent.';
        this.pushState(player);
    }

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

    private cancelWaitOrLeave (player: PlayerSocket): void
    {
        if (player.mode === 'pvp' && player.pvpPhase === 'waiting')
        {
            // Keep their save in the bank; just stop waiting for a fight.
            player.pvpPhase = 'shop';
            player.lastMessage = 'Stopped waiting. Your lineup stays saved for others. End turn again when ready.';
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
        player.mode = 'menu';
        player.run = null;
        player.pvpShop = null;
        player.pvpBattle = null;
        player.pvpPhase = 'shop';
        player.pendingGhostTeam = null;
        player.lastMessage = '';
        // Saved lineups remain in the bank for random opponents.
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

        if (player.pendingGhostTeam)
        {
            const ghost = cloneTeam(player.pendingGhostTeam);
            player.pendingGhostTeam = null;
            this.startOneWayBattle(player, ghost, turn, true);

            return;
        }

        // 1) Save this run's lineup so a random opponent can fight it later.
        this.saveLineup(turn, player.guestId, myTeam);

        // 2) Try to pull a random other saved lineup for this turn.
        const foe = this.pickRandomSavedOpponent(turn, player.guestId);

        if (foe)
        {
            this.startOneWayBattle(player, foe.team, turn, false);

            return;
        }

        player.pvpPhase = 'waiting';
        player.lastMessage = `Run saved for Turn ${turn}. Waiting for another saved lineup…`;
        this.pushState(player);
        send(player.ws, {
            type: 'queued',
            position: this.savedByTurn.get(turn)?.length ?? 0,
            turn,
        });

        // Anyone else already waiting can now pull this new save.
        this.assignWaitingPlayers(turn);
    }

    private saveLineup (turn: number, ownerGuestId: string, team: Team): void
    {
        const list = this.savedByTurn.get(turn) ?? [];
        // One active save per owner per turn — replace if they re-submit.
        const withoutOwner = list.filter((entry) => entry.ownerGuestId !== ownerGuestId);
        withoutOwner.push({
            id: `S${this.saveCounter++}`,
            turn,
            ownerGuestId,
            team: cloneTeam(team),
        });
        this.savedByTurn.set(turn, withoutOwner);
    }

    private pickRandomSavedOpponent (turn: number, excludeGuestId: string): SavedLineup | null
    {
        const list = this.savedByTurn.get(turn) ?? [];
        const others = list.filter((entry) => entry.ownerGuestId !== excludeGuestId);

        return pickRandom(others);
    }

    /** When a new save appears, give waiting players a random opponent. */
    private assignWaitingPlayers (turn: number): void
    {
        for (const player of this.players.values())
        {
            if (
                player.mode !== 'pvp'
                || player.pvpPhase !== 'waiting'
                || !player.pvpShop
                || player.pvpShop.turn !== turn
            )
            {
                continue;
            }

            const foe = this.pickRandomSavedOpponent(turn, player.guestId);

            if (foe)
            {
                this.startOneWayBattle(player, foe.team, turn, false);
            }
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
            ? `Rematch vs saved lineup (Turn ${turn}).`
            : `Turn ${turn} — fighting a random saved run.`;

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
        const won = result.winner === 'a';
        const lost = result.winner === 'b';
        let shop = { ...player.pvpShop };

        if (won)
        {
            shop = { ...shop, wins: shop.wins + 1 };
        }
        else if (lost)
        {
            shop = {
                ...shop,
                lives: Math.max(0, shop.lives - livesLostOnDefeat(result.survivingB)),
            };
        }

        player.pvpBattle = null;

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
                ? 'Integrity depleted. Rematch that saved lineup or find a new opponent.'
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
        player.lastMessage = `Turn ${nextTurn} shop. End turn to save your run and fight a random Turn ${nextTurn} save.`;
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
        const savedCount = this.savedByTurn.get(shop.turn)?.length ?? 0;
        const waitingMsg = player.pvpPhase === 'waiting'
            ? `Your Turn ${shop.turn} run is saved (${savedCount} in bank). Waiting for another save…`
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
