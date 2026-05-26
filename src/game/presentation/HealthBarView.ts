import { GameObjects } from 'phaser';
import type { Scene } from 'phaser';

const BAR_HEIGHT = 5;
const BAR_OFFSET_Y = -7;
const BG_COLOR = 0x1a1a2e;
const BG_ALPHA = 0.85;
const HEALTH_GREEN = 0x2ecc71;
const HEALTH_RED = 0xe74c3c;

const lerpColor = (from: number, to: number, t: number): number =>
{
    const fr = (from >> 16) & 0xff;
    const fg = (from >> 8) & 0xff;
    const fb = from & 0xff;
    const tr = (to >> 16) & 0xff;
    const tg = (to >> 8) & 0xff;
    const tb = to & 0xff;
    const blend = Math.max(0, Math.min(1, t));
    const r = Math.round(fr + (tr - fr) * blend);
    const g = Math.round(fg + (tg - fg) * blend);
    const b = Math.round(fb + (tb - fb) * blend);

    return (r << 16) | (g << 8) | b;
};

export class HealthBarView
{
    private readonly background: GameObjects.Rectangle;
    private readonly fill: GameObjects.Rectangle;
    private readonly barWidth: number;
    private lastClamped = Number.NaN;

    constructor (scene: Scene, barWidth: number)
    {
        this.barWidth = barWidth;

        this.background = new GameObjects.Rectangle(
            scene,
            0,
            BAR_OFFSET_Y,
            barWidth,
            BAR_HEIGHT,
            BG_COLOR,
            BG_ALPHA,
        );
        this.background.setOrigin(0, 1);

        this.fill = new GameObjects.Rectangle(
            scene,
            0,
            BAR_OFFSET_Y,
            barWidth,
            BAR_HEIGHT,
            HEALTH_GREEN,
            1,
        );
        this.fill.setOrigin(0, 1);
    }

    addTo (container: GameObjects.Container): void
    {
        container.add(this.background);
        container.add(this.fill);
    }

    setFraction (fraction: number): void
    {
        const clamped = Math.max(0, Math.min(1, fraction));

        if (Math.abs(clamped - this.lastClamped) < 0.0005)
        {
            return;
        }

        this.lastClamped = clamped;
        const showBar = clamped < 1;

        this.background.setVisible(showBar);
        this.fill.setVisible(showBar);

        if (!showBar)
        {
            return;
        }

        const damageBlend = 1 - clamped;

        this.fill.setFillStyle(lerpColor(HEALTH_GREEN, HEALTH_RED, damageBlend));
        this.fill.scaleX = clamped;
        this.fill.x = 0;
    }

    destroy (): void
    {
        this.background.destroy();
        this.fill.destroy();
    }
}
