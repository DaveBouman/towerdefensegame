import type { ClientRunView, ClientToServerMessage, ServerToClientMessage } from './protocol';
import { DEFAULT_AB_WS_PORT } from './protocol';
import { emptyClientRunView } from './clientView';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface AutoBattlerSocketHandlers {
    onStatus: (status: ConnectionStatus, detail?: string) => void;
    onState: (run: ClientRunView) => void;
    onQueued?: (position: number) => void;
    onMatchFound?: (matchId: string) => void;
    onError?: (message: string) => void;
}

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
            this.handlers.onStatus('error', 'Cannot reach auto-battler server. Start it with npm run server.');
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
                break;
            case 'state':
                this.handlers.onState(message.run);
                break;
            case 'queued':
                this.handlers.onQueued?.(message.position);
                break;
            case 'match_found':
                this.handlers.onMatchFound?.(message.matchId);
                break;
            case 'error':
                this.handlers.onError?.(message.message);
                break;
        }
    }
}
