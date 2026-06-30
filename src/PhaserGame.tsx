import { forwardRef, useLayoutEffect, useRef } from 'react';
import { loadUIFont } from './game/config/uiTypography';
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
            game.current?.destroy(true);
            game.current = null;
        };
    }, [ ref ]);

    return <div id="game-container" className="game-canvas-host" ref={containerRef} />;
});
