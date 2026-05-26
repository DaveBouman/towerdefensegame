import { forwardRef, useEffect, useLayoutEffect, useRef } from 'react';
import StartGame from './game/main';
import { EventBus } from './game/EventBus';
import { GAME_EVENTS } from './game/events/gameEvents';

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

        game.current = StartGame(containerRef.current);

        if (typeof ref === 'function')
        {
            ref({ game: game.current, scene: null });
        }
        else if (ref)
        {
            ref.current = { game: game.current, scene: null };
        }

        return () =>
        {
            game.current?.destroy(true);
            game.current = null;
        };
    }, []);

    useEffect(() =>
    {
        const onSceneReady = (scene_instance: Phaser.Scene) =>
        {
            if (currentActiveScene)
            {
                currentActiveScene(scene_instance);
            }

            if (typeof ref === 'function')
            {
                ref({ game: game.current, scene: scene_instance });
            }
            else if (ref)
            {
                ref.current = { game: game.current, scene: scene_instance };
            }
        };

        EventBus.on(GAME_EVENTS.SCENE_READY, onSceneReady);

        return () =>
        {
            EventBus.off(GAME_EVENTS.SCENE_READY, onSceneReady);
        };
    }, [ currentActiveScene, ref ]);

    return (
        <div id="game-container" ref={containerRef} />
    );

});
