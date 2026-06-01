import { forwardRef, useCallback, useEffect, useLayoutEffect, useRef, type DragEvent } from 'react';
import StartGame from './game/main';
import { EventBus } from './game/EventBus';
import { GAME_EVENTS } from './game/events/gameEvents';
import { INVENTORY_UPGRADE_DRAG_MIME } from './ui/inventoryDragMime';
import { endInventoryDrag, getActiveInventoryDragId } from './ui/inventoryDragSession';

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

    const onDragOver = useCallback((e: DragEvent<HTMLDivElement>) =>
    {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    }, []);

    const onDrop = useCallback((e: DragEvent<HTMLDivElement>) =>
    {
        e.preventDefault();
        const fromPanel = getActiveInventoryDragId();
        const fromMime = e.dataTransfer.getData(INVENTORY_UPGRADE_DRAG_MIME);
        const plain = e.dataTransfer.getData('text/plain');
        const upgradeId = fromMime || (plain === fromPanel ? plain : '');

        if (!upgradeId || upgradeId !== fromPanel)
        {
            return;
        }

        endInventoryDrag();

        EventBus.emit(GAME_EVENTS.EQUIP_CATALOG_UPGRADE_AT_SCREEN, {
            upgradeId,
            clientX: e.clientX,
            clientY: e.clientY,
        });
    }, []);

    return (
        <div
            id="game-container"
            ref={containerRef}
            onDragOver={onDragOver}
            onDrop={onDrop}
        />
    );

});
