import { forwardRef, useCallback, useEffect, useLayoutEffect, useRef, type DragEvent, type UIEvent } from 'react';
import StartGame from './game/main';
import { VIEWPORT_CONFIG, getGridPixelSize } from './game/config/gridConfig';
import { WORLD_LAYOUT } from './game/config/worldLayout';
import type { TowerDefinitionId } from './game/config/towerCatalog';
import { EventBus } from './game/EventBus';
import { GAME_EVENTS } from './game/events/gameEvents';
import { INVENTORY_UPGRADE_DRAG_MIME } from './ui/inventoryDragMime';
import { endInventoryDrag, getActiveInventoryDragId } from './ui/inventoryDragSession';
import { TOWER_QUEUE_DRAG_MIME } from './ui/towerQueueDragMime';

const WORLD_SCROLL_HEIGHT = WORLD_LAYOUT.arenaPixelSize().height;
const VIEWPORT_HEIGHT = getGridPixelSize(VIEWPORT_CONFIG).height;

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
    const scrollTrackRef = useRef<HTMLDivElement>(null);
    const scrollSyncingRef = useRef(false);

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
        const onCameraScroll = ({ scrollY }: { scrollY: number; maxScrollY: number }) =>
        {
            const track = scrollTrackRef.current;

            if (!track || scrollSyncingRef.current)
            {
                return;
            }

            scrollSyncingRef.current = true;
            track.scrollTop = scrollY;
            scrollSyncingRef.current = false;
        };

        EventBus.on(GAME_EVENTS.CAMERA_SCROLL_CHANGED, onCameraScroll);

        return () => EventBus.off(GAME_EVENTS.CAMERA_SCROLL_CHANGED, onCameraScroll);
    }, []);

    useEffect(() =>
    {
        const onSceneReady = (scene_instance: Phaser.Scene) =>
        {
            if (currentActiveScene)
            {
                currentActiveScene(scene_instance);
            }

            EventBus.emit(GAME_EVENTS.REQUEST_CAMERA_SCROLL);

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

    const onScrollTrack = useCallback((e: UIEvent<HTMLDivElement>) =>
    {
        if (scrollSyncingRef.current)
        {
            return;
        }

        EventBus.emit(GAME_EVENTS.SET_CAMERA_SCROLL_Y, { scrollY: e.currentTarget.scrollTop });
    }, []);

    const onDrop = useCallback((e: DragEvent<HTMLDivElement>) =>
    {
        e.preventDefault();
        const fromPanel = getActiveInventoryDragId();
        const fromMime = e.dataTransfer.getData(INVENTORY_UPGRADE_DRAG_MIME);
        const plain = e.dataTransfer.getData('text/plain');
        const upgradeId = fromMime || (plain === fromPanel ? plain : '');
        const queuedTowerId = e.dataTransfer.getData(TOWER_QUEUE_DRAG_MIME);

        if (queuedTowerId)
        {
            EventBus.emit(GAME_EVENTS.PLACE_QUEUED_TOWER_AT_SCREEN, {
                towerId: queuedTowerId as TowerDefinitionId,
                clientX: e.clientX,
                clientY: e.clientY,
            });
            return;
        }

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
        <div className="game-viewport">
            <div
                id="game-container"
                ref={containerRef}
                onDragOver={onDragOver}
                onDrop={onDrop}
            />
            <div
                className="game-scroll-track"
                ref={scrollTrackRef}
                style={{ height: VIEWPORT_HEIGHT }}
                onScroll={onScrollTrack}
                aria-label="Scroll map vertically"
                role="scrollbar"
                aria-orientation="vertical"
            >
                <div
                    className="game-scroll-track__spacer"
                    style={{ height: WORLD_SCROLL_HEIGHT }}
                />
            </div>
        </div>
    );

});
