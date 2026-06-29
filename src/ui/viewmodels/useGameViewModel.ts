import { useEffect, useRef, useState } from 'react';
import { EventBus } from '../../game/EventBus';
import { GAME_EVENTS } from '../../game/events/gameEvents';
import type { GameStateSnapshot } from '../../game/domain/types';

const INITIAL_STATE: GameStateSnapshot = {
    gold: 100,
    wave: 0,
    lives: 10,
    runOutcome: 'playing',
    canStartWave: true,
    paused: false,
};

export const useGameViewModel = () =>
{
    const [ state, setState ] = useState<GameStateSnapshot>(INITIAL_STATE);
    const pendingRef = useRef<GameStateSnapshot | null>(null);

    useEffect(() =>
    {
        const flushIntervalMs = 50;
        let rafId: number | null = null;
        let timerId: ReturnType<typeof setTimeout> | null = null;
        let lastFlushAt = 0;

        const flush = () =>
        {
            const pending = pendingRef.current;

            if (!pending)
            {
                return;
            }

            pendingRef.current = null;
            lastFlushAt = Date.now();
            setState(pending);
        };

        const scheduleFlush = () =>
        {
            if (rafId !== null || timerId !== null)
            {
                return;
            }

            const wait = Math.max(0, flushIntervalMs - (Date.now() - lastFlushAt));
            const request = () =>
            {
                rafId = requestAnimationFrame(() =>
                {
                    rafId = null;
                    flush();
                });
            };

            if (wait === 0)
            {
                request();
            }
            else
            {
                timerId = setTimeout(() =>
                {
                    timerId = null;
                    request();
                }, wait);
            }
        };

        const onStateChanged = (snapshot: GameStateSnapshot) =>
        {
            pendingRef.current = snapshot;
            scheduleFlush();
        };

        EventBus.on(GAME_EVENTS.STATE_CHANGED, onStateChanged);

        return () =>
        {
            EventBus.off(GAME_EVENTS.STATE_CHANGED, onStateChanged);

            if (rafId !== null)
            {
                cancelAnimationFrame(rafId);
            }

            if (timerId !== null)
            {
                clearTimeout(timerId);
            }
        };
    }, []);

    return state;
};
