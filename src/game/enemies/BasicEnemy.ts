import { VISUAL_LERP_SMOOTHNESS } from '../config/visualConfig';
import { BASIC_ENEMY_CONFIG } from '../config/enemyConfig';
import { bodySize } from '../config/entityBodies';
import type { Grid } from '../grid/Grid';
import type { WorldPosition } from '../grid/types';
import { copyWorldPosition, lerpWorldPosition } from '../grid/worldPosition';
import type { EnemyConfig } from './types';
import { EnemyView } from './EnemyView';

export class BasicEnemy
{
    private readonly view: EnemyView;
    private readonly bodySizePx: number;
    private readonly displayPosition: WorldPosition;
    private targetPosition: WorldPosition;
    private lastTopLeftX = Number.NaN;
    private lastTopLeftY = Number.NaN;

    constructor (
        scene: Phaser.Scene,
        grid: Grid,
        position: WorldPosition,
        onSelect?: () => void,
        config: EnemyConfig = BASIC_ENEMY_CONFIG,
    )
    {
        this.displayPosition = copyWorldPosition(position);
        this.targetPosition = copyWorldPosition(position);
        this.bodySizePx = bodySize(grid.config, config.sizeScale);

        this.view = new EnemyView(scene, this.bodySizePx, config.color, { onSelect });
        this.view.gameObject.setDepth(10);

        this.applyDisplayPosition();
    }

    setTargetPosition (position: WorldPosition): void
    {
        this.targetPosition = copyWorldPosition(position);
    }

    getDisplayPosition (): WorldPosition
    {
        return copyWorldPosition(this.displayPosition);
    }

    lerpTowardTarget (deltaMs: number): void
    {
        this.displayPosition = lerpWorldPosition(
            this.displayPosition,
            this.targetPosition,
            deltaMs,
            VISUAL_LERP_SMOOTHNESS,
        );
        this.applyDisplayPosition();
    }

    setHealth (health: number, maxHealth: number): void
    {
        const fraction = maxHealth > 0 ? health / maxHealth : 0;

        this.view.setHealthFraction(fraction);
    }

    flashHit (): void
    {
        this.view.flashHit();
    }

    destroy (): void
    {
        this.view.destroy();
    }

    private applyDisplayPosition (): void
    {
        const topLeft = {
            x: this.displayPosition.x - this.bodySizePx / 2,
            y: this.displayPosition.y - this.bodySizePx / 2,
        };

        if (
            Math.abs(topLeft.x - this.lastTopLeftX) < 0.02
            && Math.abs(topLeft.y - this.lastTopLeftY) < 0.02
        )
        {
            return;
        }

        this.lastTopLeftX = topLeft.x;
        this.lastTopLeftY = topLeft.y;
        this.view.setPosition(topLeft.x, topLeft.y);
    }
}
