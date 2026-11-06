import { WebSocketServer } from 'ws';
import { DEFAULT_AB_WS_PORT, parseClientMessage } from '../src/game/autoBattler/shared/protocol';
import { SessionStore } from './sessionStore';

const port = Number(process.env.AB_WS_PORT ?? DEFAULT_AB_WS_PORT);
const store = new SessionStore();
const wss = new WebSocketServer({ port });

wss.on('connection', (ws) =>
{
    store.connect(ws);

    ws.on('message', (data) =>
    {
        const raw = typeof data === 'string' ? data : data.toString('utf8');
        const message = parseClientMessage(raw);

        if (!message)
        {
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid message.' }));

            return;
        }

        store.handle(ws, message);
    });

    ws.on('close', () =>
    {
        store.disconnect(ws);
    });
});

console.log(`[signal-chain] authoritative auto-battler WS on ws://127.0.0.1:${port}`);
console.log('[signal-chain] Client is display-only — shop RNG + battles run here only.');
