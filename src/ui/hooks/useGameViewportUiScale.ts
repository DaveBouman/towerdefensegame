import { useEffect } from 'react';
import {
    getGameViewportElement,
    syncGameViewportUiScale,
} from '../../game/ui/gameViewport';

/** Keeps --ui-scale on #game-viewport in sync with the 16:9 frame size. */
export const useGameViewportUiScale = (): void =>
{
    useEffect(() =>
    {
        const viewport = getGameViewportElement();

        if (!viewport)
        {
            return;
        }

        const sync = (): void =>
        {
            syncGameViewportUiScale();
        };

        sync();

        const observer = new ResizeObserver(sync);
        observer.observe(viewport);
        window.addEventListener('resize', sync);

        return () =>
        {
            observer.disconnect();
            window.removeEventListener('resize', sync);
        };
    }, []);
};
