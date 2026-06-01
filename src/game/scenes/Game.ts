import { getGridPixelSize, GRID_CONFIG } from '../config/gridConfig';
import { GameSession } from '../domain/GameSession';
import { EventBus } from '../EventBus';
import { GAME_EVENTS } from '../events/gameEvents';
import { Grid } from '../grid/Grid';
import type { GridView } from '../grid/GridView';
import { CameraPanController } from '../presentation/CameraPanController';
import { GameSceneController } from '../presentation/GameSceneController';
import { canAddToScene } from '../presentation/sceneReady';
import { Scene } from 'phaser';

export class Game extends Scene
{
    private session!: GameSession;
    private grid!: Grid;
    private gridView!: GridView;
    private controller!: GameSceneController;
    private cameraPan!: CameraPanController;

    constructor ()
    {
        super('Game');
    }

    create (): void
    {
        this.grid = new Grid(GRID_CONFIG);
        this.gridView = this.grid.draw(this);
        this.cameraPan = new CameraPanController(this, getGridPixelSize(GRID_CONFIG));
        this.session = new GameSession(this.grid);
        this.controller = new GameSceneController(this, this.grid, this.session);
        this.controller.bind();
        EventBus.on(GAME_EVENTS.SET_CAMERA_SCROLL_Y, this.onSetCameraScrollY, this);
        EventBus.on(GAME_EVENTS.REQUEST_CAMERA_SCROLL, this.publishCameraScroll, this);

        this.time.delayedCall(0, () =>
        {
            if (!canAddToScene(this))
            {
                return;
            }

            this.cameraPan.initialize();
            this.publishCameraScroll();
            this.controller.startSession();
        });

        EventBus.emit(GAME_EVENTS.SCENE_READY, this);
    }

    shutdown (): void
    {
        EventBus.off(GAME_EVENTS.SET_CAMERA_SCROLL_Y, this.onSetCameraScrollY, this);
        EventBus.off(GAME_EVENTS.REQUEST_CAMERA_SCROLL, this.publishCameraScroll, this);
        this.controller?.destroy();
        this.cameraPan?.destroy();
        this.session?.reset();
    }

    private onSetCameraScrollY ({ scrollY }: { scrollY: number }): void
    {
        if (!canAddToScene(this))
        {
            return;
        }

        if (this.cameraPan.setScrollY(scrollY))
        {
            this.publishCameraScroll();
        }
    }

    private publishCameraScroll (): void
    {
        const scroll = this.cameraPan.tryGetScrollState();

        if (!scroll)
        {
            return;
        }

        EventBus.emit(GAME_EVENTS.CAMERA_SCROLL_CHANGED, scroll);
    }

    update (_time: number, delta: number): void
    {
        if (!canAddToScene(this))
        {
            return;
        }

        const ticksToRun = this.session.isRoundActive()
            ? this.session.clock.consumeFrame(delta)
            : 0;

        for (let i = 0; i < ticksToRun; i++)
        {
            this.session.advanceTick();
        }

        this.controller.syncPresentation(delta);

        if (this.cameraPan.update(delta))
        {
            this.publishCameraScroll();
        }
    }
}
