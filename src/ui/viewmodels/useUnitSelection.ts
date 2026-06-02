import { useCallback, useEffect, useRef, useState } from 'react';
import { EventBus } from '../../game/EventBus';
import { GAME_EVENTS } from '../../game/events/gameEvents';
import type { UnitSelection } from '../../game/domain/types';

export const useUnitSelection = () =>
{
    const [ selection, setSelection ] = useState<UnitSelection | null>(null);
    const pendingRef = useRef<UnitSelection | null>(null);

    useEffect(() =>
    {
        const flushIntervalMs = 50; // 20Hz UI updates max.
        let rafId: number | null = null;
        let timerId: ReturnType<typeof setTimeout> | null = null;
        let lastFlushAt = 0;

        const flush = () =>
        {
            lastFlushAt = Date.now();
            setSelection(pendingRef.current);
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

        const onSelectionChanged = (next: UnitSelection | null) =>
        {
            pendingRef.current = next;
            scheduleFlush();
        };

        EventBus.on(GAME_EVENTS.SELECTION_CHANGED, onSelectionChanged);

        return () =>
        {
            EventBus.off(GAME_EVENTS.SELECTION_CHANGED, onSelectionChanged);

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

    const clear = useCallback(() =>
    {
        EventBus.emit(GAME_EVENTS.SELECTION_CLEARED);
    }, []);

    return { selection, clear };
};
