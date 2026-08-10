import { BlendModes } from 'phaser';
import { CYBER } from '../config/cyberpunkTheme';
import { drawCornerBrackets } from '../config/cyberpunkUiGraphics';

const BG_DEPTH = -25;

/** Digital nav-map backdrop — dot matrix + HUD frame, distinct from route edges. */
export class MapBackgroundView
{
    readonly container: Phaser.GameObjects.Container;
    private readonly base: Phaser.GameObjects.Graphics;
    private readonly dotGrid: Phaser.GameObjects.Graphics;
    private readonly mapBlips: Phaser.GameObjects.Graphics;
    private readonly mapFrame: Phaser.GameObjects.Graphics;
    private readonly ambientGlow: Phaser.GameObjects.Graphics;
    private readonly scanBand: Phaser.GameObjects.Rectangle;
    private readonly packetLayer: Phaser.GameObjects.Container;
    private breatheTween?: Phaser.Tweens.Tween;
    private scanTween?: Phaser.Tweens.Tween;
    private packetTweens: Phaser.Tweens.Tween[] = [];
    private width = 0;
    private height = 0;

    constructor (private readonly scene: Phaser.Scene)
    {
        this.container = scene.add.container(0, 0).setDepth(BG_DEPTH).setScrollFactor(0);
        this.base = scene.add.graphics();
        this.dotGrid = scene.add.graphics();
        this.mapBlips = scene.add.graphics();
        this.ambientGlow = scene.add.graphics();
        this.mapFrame = scene.add.graphics();
        this.scanBand = scene.add.rectangle(0, 0, 4, 4, CYBER.cyan, 0.04);
        this.scanBand.setOrigin(0.5, 0);
        this.scanBand.setBlendMode(BlendModes.ADD);
        this.packetLayer = scene.add.container(0, 0);

        this.container.add([
            this.base,
            this.dotGrid,
            this.mapBlips,
            this.ambientGlow,
            this.packetLayer,
            this.mapFrame,
            this.scanBand,
        ]);
    }

    resize (width: number, height: number): void
    {
        this.width = width;
        this.height = height;
        this.redraw();
        this.restartMotion();
    }

    destroy (): void
    {
        this.breatheTween?.stop();
        this.scanTween?.stop();
        this.packetTweens.forEach((tween) => tween.stop());
        this.packetTweens = [];
        this.container.destroy();
    }

    private redraw (): void
    {
        const { width, height } = this;

        this.drawBase(width, height);
        this.drawDotGrid(width, height);
        this.drawMapBlips(width, height);
        this.drawAmbientGlow(width, height);
        this.drawMapFrame(width, height);

        this.scanBand.setSize(width * 1.05, Math.max(36, height * 0.06));
        this.scanBand.setPosition(width / 2, -this.scanBand.displayHeight);

        this.rebuildPackets(width, height);
    }

    /** Deep corridor — quiet, forward-looking, not arena combat. */
    private drawBase (width: number, height: number): void
    {
        this.base.clear();

        this.base.fillStyle(0x070e18, 1);
        this.base.fillRect(0, 0, width, height);

        // Path ahead glows slightly (left = past, right = route forward).
        this.base.fillStyle(0x0e1828, 0.75);
        this.base.fillRect(0, 0, width * 0.45, height);

        this.base.fillStyle(0x102030, 0.6);
        this.base.fillRect(width * 0.45, 0, width * 0.55, height);

        this.base.fillStyle(CYBER.green, 0.035);
        this.base.fillEllipse(width * 0.72, height * 0.5, width * 0.55, height * 0.65);

        this.base.fillStyle(0x1a3050, 0.05);
        this.base.fillEllipse(width * 0.2, height * 0.55, width * 0.35, height * 0.5);

        this.drawVignette(this.base, width, height);
    }

    private drawVignette (graphics: Phaser.GameObjects.Graphics, width: number, height: number): void
    {
        const bands = 12;

        for (let i = 0; i < bands; i++)
        {
            const t = i / bands;
            const alpha = t * t * 0.2;

            graphics.fillStyle(0x000000, alpha);
            graphics.fillRect(0, height * t * 0.08, width, height * 0.06);
            graphics.fillRect(0, height - height * t * 0.08 - height * 0.06, width, height * 0.06);
        }
    }

    /** Dot matrix — navigation grid without line segments that clash with route edges. */
    private drawDotGrid (width: number, height: number): void
    {
        this.dotGrid.clear();

        const spacing = Math.max(40, Math.min(56, Math.round(width / 28)));
        const padX = spacing * 0.75;
        const padY = spacing * 0.75;
        const cols = Math.ceil((width - padX * 2) / spacing);
        const rows = Math.ceil((height - padY * 2) / spacing);

        for (let row = 0; row <= rows; row++)
        {
            for (let col = 0; col <= cols; col++)
            {
                const x = padX + col * spacing;
                const y = padY + row * spacing;
                const edgeFade = Math.min(
                    x / (width * 0.12),
                    (width - x) / (width * 0.12),
                    y / (height * 0.14),
                    (height - y) / (height * 0.14),
                    1,
                );
                const alpha = 0.04 + edgeFade * 0.07;

                this.dotGrid.fillStyle(CYBER.cyan, alpha * 0.7);
                this.dotGrid.fillCircle(x, y, 1);

                if (col % 4 === 0 && row % 4 === 0)
                {
                    this.dotGrid.fillStyle(CYBER.green, alpha * 0.55);
                    this.dotGrid.fillCircle(x, y, 1.5);
                }
            }
        }
    }

    /** Static POI markers — small crosses, not drifting lane traffic. */
    private drawMapBlips (width: number, height: number): void
    {
        this.mapBlips.clear();

        const count = 28;

        for (let i = 0; i < count; i++)
        {
            const seed = i * 17389 + width * 2;
            const x = pad(seed, 0.08, 0.92) * width;
            const y = pad(seed + 1, 0.18, 0.82) * height;
            const alpha = 0.05 + pseudo(seed + 2) * 0.08;
            const color = pseudo(seed + 3) > 0.55 ? CYBER.green : 0x4a6a8a;
            const arm = 2 + pseudo(seed + 4) * 2;

            this.mapBlips.lineStyle(1, color, alpha);
            this.mapBlips.beginPath();
            this.mapBlips.moveTo(x - arm, y);
            this.mapBlips.lineTo(x + arm, y);
            this.mapBlips.moveTo(x, y - arm);
            this.mapBlips.lineTo(x, y + arm);
            this.mapBlips.strokePath();

            if (pseudo(seed + 5) > 0.72)
            {
                this.mapBlips.fillStyle(color, alpha * 0.65);
                this.mapBlips.fillCircle(x, y, 1);
            }
        }
    }

    private drawAmbientGlow (width: number, height: number): void
    {
        this.ambientGlow.clear();

        this.ambientGlow.fillStyle(CYBER.green, 0.05);
        this.ambientGlow.fillEllipse(width * 0.58, height * 0.5, width * 0.38, height * 0.28);

        this.ambientGlow.fillStyle(CYBER.cyan, 0.03);
        this.ambientGlow.fillEllipse(width * 0.35, height * 0.48, width * 0.22, height * 0.18);
    }

    /** Slow data pings — drifting dots, not lane lines. */
    private rebuildPackets (width: number, height: number): void
    {
        this.packetTweens.forEach((tween) => tween.stop());
        this.packetTweens = [];
        this.packetLayer.removeAll(true);

        const packetCount = 8;
        const top = height * 0.16;
        const bottom = height * 0.84;

        for (let i = 0; i < packetCount; i++)
        {
            const seed = i * 92821 + width;
            const y = top + pseudo(seed) * (bottom - top);
            const size = 1.5 + pseudo(seed + 1) * 2;
            const color = pseudo(seed + 2) > 0.45 ? CYBER.cyan : CYBER.green;
            const dot = this.scene.add.circle(0, y, size, color, 0.35 + pseudo(seed + 3) * 0.3);

            dot.setBlendMode(BlendModes.ADD);
            this.packetLayer.add(dot);

            const startX = width * (0.02 + pseudo(seed + 4) * 0.25);
            const endX = width * (0.7 + pseudo(seed + 5) * 0.26);

            dot.setX(startX);

            const tween = this.scene.tweens.add({
                targets: dot,
                x: endX,
                alpha: { from: 0.25, to: 0.75 },
                duration: 7000 + pseudo(seed + 6) * 9000,
                repeat: -1,
                yoyo: false,
                onRepeat: () => dot.setX(startX),
                ease: 'Sine.easeInOut',
            });

            this.packetTweens.push(tween);
        }
    }

    /** HUD map frame — corner brackets and edge ticks, no path lines. */
    private drawMapFrame (width: number, height: number): void
    {
        this.mapFrame.clear();

        const insetX = width * 0.04;
        const insetY = height * 0.12;
        const frameW = width - insetX * 2;
        const frameH = height - insetY * 2;

        drawCornerBrackets(this.mapFrame, insetX, insetY, frameW, frameH, CYBER.cyan, {
            arm: Math.min(28, Math.round(Math.min(frameW, frameH) * 0.06)),
            lineWidth: 1,
            alpha: 0.22,
        });

        this.mapFrame.lineStyle(1, CYBER.cyan, 0.1);
        this.mapFrame.strokeRect(insetX, insetY, frameW, frameH);

        const tickCount = 10;

        for (let i = 1; i < tickCount; i++)
        {
            const t = i / tickCount;
            const tx = insetX + frameW * t;
            const ty = insetY + frameH * t;

            this.mapFrame.lineStyle(1, CYBER.cyan, 0.05);
            this.mapFrame.beginPath();
            this.mapFrame.moveTo(tx, insetY);
            this.mapFrame.lineTo(tx, insetY + 6);
            this.mapFrame.moveTo(tx, insetY + frameH);
            this.mapFrame.lineTo(tx, insetY + frameH - 6);
            this.mapFrame.strokePath();

            if (i % 2 === 0)
            {
                this.mapFrame.beginPath();
                this.mapFrame.moveTo(insetX, ty);
                this.mapFrame.lineTo(insetX + 6, ty);
                this.mapFrame.moveTo(insetX + frameW, ty);
                this.mapFrame.lineTo(insetX + frameW - 6, ty);
                this.mapFrame.strokePath();
            }
        }

        this.mapFrame.lineStyle(1, CYBER.green, 0.07);
        this.mapFrame.beginPath();
        this.mapFrame.moveTo(insetX + 18, insetY + frameH * 0.5);
        this.mapFrame.lineTo(insetX + 36, insetY + frameH * 0.5);
        this.mapFrame.strokePath();
        this.mapFrame.fillStyle(CYBER.green, 0.55);
        this.mapFrame.fillCircle(insetX + 40, insetY + frameH * 0.5, 2.5);
    }

    private restartMotion (): void
    {
        this.breatheTween?.stop();
        this.scanTween?.stop();

        this.ambientGlow.setAlpha(1);
        this.scanBand.setAlpha(0.45);

        this.breatheTween = this.scene.tweens.add({
            targets: this.ambientGlow,
            alpha: { from: 0.6, to: 1 },
            duration: 4800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });

        this.scanTween = this.scene.tweens.add({
            targets: this.scanBand,
            y: this.height + this.scanBand.displayHeight * 0.15,
            alpha: { from: 0.08, to: 0.28 },
            duration: 12000,
            repeat: -1,
            ease: 'Sine.easeInOut',
            onRepeat: () =>
            {
                this.scanBand.setY(-this.scanBand.displayHeight);
            },
        });
    }
}

const pseudo = (seed: number): number =>
{
    const x = Math.sin(seed * 12.9898) * 43758.5453;

    return x - Math.floor(x);
};

const pad = (seed: number, min: number, max: number): number => min + pseudo(seed) * (max - min);
