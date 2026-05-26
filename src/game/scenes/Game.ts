import { GRID_CONFIG } from '../config/gridConfig';
import { GameSession } from '../domain/GameSession';
import { EventBus } from '../EventBus';
import { GAME_EVENTS } from '../events/gameEvents';
import { Grid } from '../grid/Grid';
import type { GridView } from '../grid/GridView';
import { GameSceneController } from '../presentation/GameSceneController';
import { canAddToScene } from '../presentation/sceneReady';
import { Scene } from 'phaser';

export class Game extends Scene
{
    private session!: GameSession;
    private grid!: Grid;
    private gridView!: GridView;
    private controller!: GameSceneController;

    constructor ()
    {
        super('Game');
    }

    create (): void
    {
        this.grid = new Grid(GRID_CONFIG);
        this.gridView = this.grid.draw(this);
        this.session = new GameSession(this.grid);
        this.controller = new GameSceneController(this, this.grid, this.session);
        this.controller.bind();

        this.time.delayedCall(0, () =>
        {
            if (!canAddToScene(this))
            {
                return;
            }

            this.controller.startSession();
        });

        EventBus.emit(GAME_EVENTS.SCENE_READY, this);
    }

    shutdown (): void
    {
        this.controller?.destroy();
        this.session?.reset();
    }

    update (_time: number, delta: number): void
    {
        if (!canAddToScene(this))
        {
            return;
        }

        const ticksToRun = this.session.clock.consumeFrame(delta);

        for (let i = 0; i < ticksToRun; i++)
        {
            this.session.advanceTick();
        }

        this.controller.syncPresentation(delta);
    }
}
