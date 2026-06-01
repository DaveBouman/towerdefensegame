import { GRID_CONFIG } from '../config/gridConfig';
import { WORLD_LAYOUT } from '../config/worldLayout';
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
        const worldSize = WORLD_LAYOUT.arenaPixelSize();

        this.drawNexusZones(worldSize.width);
        this.gridView = this.grid.draw(this);
        this.cameraPan = new CameraPanController(this, worldSize);
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

    private drawNexusZones (arenaWidth: number): void
    {
        const enemyZone = WORLD_LAYOUT.enemyNexusZoneRect(arenaWidth);
        const topZone = this.add.rectangle(
            enemyZone.centerX,
            enemyZone.centerY,
            enemyZone.width,
            enemyZone.height,
            0x3d2a5c,
            0.55,
        );

        topZone.setDepth(-2);

        const playerZone = WORLD_LAYOUT.playerNexusZoneRect(arenaWidth);
        const bottomZone = this.add.rectangle(
            playerZone.centerX,
            playerZone.centerY,
            playerZone.width,
            playerZone.height,
            0x1a3a5c,
            0.55,
        );

        bottomZone.setDepth(-2);
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
