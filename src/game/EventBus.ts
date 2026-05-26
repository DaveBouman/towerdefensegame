import { Events } from 'phaser';
import type { GameEventMap } from './events/gameEventMap';

type EventKey = keyof GameEventMap;

type EventHandler<K extends EventKey> = (payload: GameEventMap[K]) => void;

const emitter = new Events.EventEmitter();

export const EventBus = {
    emit<K extends EventKey> (event: K, ...args: GameEventMap[K] extends void ? [] : [ GameEventMap[K] ]): void
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
