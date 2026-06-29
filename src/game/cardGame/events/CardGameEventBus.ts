import { Events } from 'phaser';
import type { CardGameEventMap } from './cardGameEventMap';

type EventKey = keyof CardGameEventMap;

type EventHandler<K extends EventKey> = (payload: CardGameEventMap[K]) => void;

const emitter = new Events.EventEmitter();

export const CardGameEventBus = {
    emit<K extends EventKey> (event: K, ...args: CardGameEventMap[K] extends void ? [] : [ CardGameEventMap[K] ]): void
    {
        if (args.length === 0)
        {
            emitter.emit(event);
        }
        else
        {
            emitter.emit(event, args[0]);
        }
    },

    on<K extends EventKey> (event: K, handler: EventHandler<K>, context?: unknown): void
    {
        emitter.on(event, handler as (...args: unknown[]) => void, context);
    },

    off<K extends EventKey> (event: K, handler?: EventHandler<K>, context?: unknown): void
    {
        emitter.off(event, handler as (...args: unknown[]) => void, context);
    },
};
