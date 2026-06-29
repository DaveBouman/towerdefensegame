import { Events } from 'phaser';
import type { CardGameEventMap } from './cardGameEventMap';

type EventKey = keyof CardGameEventMap;

type EventHandler<K extends EventKey> = (payload: CardGameEventMap[K]) => void;

const EMITTER_KEY = '__td_card_game_event_bus_emitter__';

const getEmitter = (): Events.EventEmitter =>
{
    const global = globalThis as typeof globalThis & { [EMITTER_KEY]?: Events.EventEmitter };

    if (!global[EMITTER_KEY])
    {
        global[EMITTER_KEY] = new Events.EventEmitter();
    }

    return global[EMITTER_KEY];
};

export const CardGameEventBus = {
    emit<K extends EventKey> (event: K, ...args: CardGameEventMap[K] extends void ? [] : [ CardGameEventMap[K] ]): void
    {
        if (args.length === 0)
        {
            getEmitter().emit(event);
        }
        else
        {
            getEmitter().emit(event, args[0]);
        }
    },

    on<K extends EventKey> (event: K, handler: EventHandler<K>, context?: unknown): void
    {
        getEmitter().on(event, handler as (...args: unknown[]) => void, context);
    },

    off<K extends EventKey> (event: K, handler?: EventHandler<K>, context?: unknown): void
    {
        getEmitter().off(event, handler as (...args: unknown[]) => void, context);
    },
};
