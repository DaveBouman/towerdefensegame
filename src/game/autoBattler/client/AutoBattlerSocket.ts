import {
    DEFAULT_AB_WS_PORT,
    emptyClientRunView,
    type ClientRunView,
    type ClientToServerMessage,
    type PublicRules,
    type ServerToClientMessage,
    DEFAULT_PUBLIC_RULES,
} from '../shared';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface AutoBattlerSocketHandlers {
    onStatus: (status: ConnectionStatus, detail?: string) => void;
    onWelcome: (guestId: string, rules: PublicRules) => void;
    onState: (run: ClientRunView) => void;
    onQueued?: (position: number, turn: number) => void;
    onMatchFound?: (matchId: string, turn: number) => void;
    onError?: (message: string) => void;
}

const GUEST_STORAGE_KEY = 'signal-chain-ab-guest';

export const loadStoredGuestId = (): string | undefined =>
{
    try
    {
        return localStorage.getItem(GUEST_STORAGE_KEY) ?? undefined;
    }
    catch
    {
        return undefined;
    }
};

export const storeGuestId = (guestId: string): void =>
{
    try
    {
        localStorage.setItem(GUEST_STORAGE_KEY, guestId);
    }
    catch
    {
        // ignore
    }
};

const defaultWsUrl = (): string =>
{
    const fromEnv = (import.meta as { env?: Record<string, string> }).env?.VITE_AB_WS_URL;

    if (fromEnv)
    {
        return fromEnv;
    }

    const host = typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1';

    return `ws://${host}:${DEFAULT_AB_WS_PORT}`;
};

export class AutoBattlerSocket
{
    private ws: WebSocket | null = null;
    private guestId: string | null = null;
    private readonly handlers: AutoBattlerSocketHandlers;
    private readonly url: string;

    constructor (handlers: AutoBattlerSocketHandlers, url = defaultWsUrl())
    {
        this.handlers = handlers;
        this.url = url;
        this.guestId = loadStoredGuestId() ?? null;
    }

    getGuestId (): string | null
    {
        return this.guestId;
    }

    connect (): void
    {
        if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING))
        {
            return;
        }

        this.handlers.onStatus('connecting');
        const ws = new WebSocket(this.url);
        this.ws = ws;

        ws.onopen = () =>
        {
            this.handlers.onStatus('connected');
            this.send({ type: 'hello', guestId: this.guestId ?? undefined });
        };

        ws.onclose = () =>
        {
            this.handlers.onStatus('disconnected');
            this.handlers.onState(emptyClientRunView());
        };

        ws.onerror = () =>
        {
            this.handlers.onStatus(
                'error',
                'Cannot reach auto-battler server. Start it with npm run server.',
            );
        };

        ws.onmessage = (event) =>
        {
            try
            {
                const message = JSON.parse(String(event.data)) as ServerToClientMessage;
                this.receive(message);
            }
            catch
            {
                this.handlers.onError?.('Bad server message.');
            }
        };
    }

    disconnect (): void
    {
        this.ws?.close();
        this.ws = null;
    }

    send (message: ClientToServerMessage): void
    {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN)
        {
            this.handlers.onError?.('Not connected to server.');

            return;
        }

        this.ws.send(JSON.stringify(message));
    }

    private receive (message: ServerToClientMessage): void
    {
        switch (message.type)
        {
            case 'welcome':
                this.guestId = message.guestId;
                storeGuestId(message.guestId);
                this.handlers.onWelcome(message.guestId, message.rules ?? DEFAULT_PUBLIC_RULES);
                break;
            case 'state':
                this.handlers.onState(message.run);
                break;
            case 'queued':
                this.handlers.onQueued?.(message.position, message.turn);
                break;
            case 'match_found':
                this.handlers.onMatchFound?.(message.matchId, message.turn);
                break;
            case 'error':
                this.handlers.onError?.(message.message);
                break;
        }
    }
}
