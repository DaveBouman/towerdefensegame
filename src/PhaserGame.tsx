import { forwardRef, useLayoutEffect, useRef } from 'react';
import { loadUIFont } from './game/config/uiTypography';
import { GAME_VIEWPORT_ID } from './game/ui/gameViewport';
import StartGame from './game/main';

export interface IRefPhaserGame
{
    game: Phaser.Game | null;
    scene: Phaser.Scene | null;
}

interface IProps
{
    currentActiveScene?: (scene_instance: Phaser.Scene) => void
}

export const PhaserGame = forwardRef<IRefPhaserGame, IProps>(function PhaserGame({ currentActiveScene }, ref)
{
    const game = useRef<Phaser.Game | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const resizeObserverRef = useRef<ResizeObserver | null>(null);

    useLayoutEffect(() =>
    {
        if (game.current !== null || containerRef.current === null)
        {
            return;
        }

        let cancelled = false;

        void loadUIFont().then(() =>
        {
            if (cancelled || containerRef.current === null)
            {
                return;
            }

            game.current = StartGame(containerRef.current);

            const viewport = document.getElementById(GAME_VIEWPORT_ID);

            if (viewport)
            {
                const resizeObserver = new ResizeObserver((entries) =>
                {
                    const entry = entries[0];

                    if (!entry || !game.current)
                    {
                        return;
                    }

                    const { width, height } = entry.contentRect;

                    game.current.scale.resize(
                        Math.max(1, Math.round(width)),
                        Math.max(1, Math.round(height)),
                    );
                });

                resizeObserver.observe(viewport);
                resizeObserverRef.current = resizeObserver;
            }

            if (typeof ref === 'function')
            {
                ref({ game: game.current, scene: null });
            }
            else if (ref)
            {
                ref.current = { game: game.current, scene: null };
            }
        });

        return () =>
        {
            cancelled = true;
            resizeObserverRef.current?.disconnect();
            resizeObserverRef.current = null;
            game.current?.destroy(true);
            game.current = null;
        };
    }, [ ref ]);

    return <div id="game-container" className="game-canvas-host" ref={containerRef} />;
});
