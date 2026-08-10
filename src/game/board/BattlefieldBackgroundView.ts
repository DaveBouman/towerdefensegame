import { BlendModes } from 'phaser';
import { CYBER } from '../config/cyberpunkTheme';
import { drawCornerBrackets } from '../config/cyberpunkUiGraphics';
import type { BoardLayout } from './boardLayout';

const BG_DEPTH = -20;

/** Full-screen neon arena backdrop behind the 5×5 board during fights. */
export class BattlefieldBackgroundView
{
    readonly container: Phaser.GameObjects.Container;
    private readonly base: Phaser.GameObjects.Graphics;
    private readonly gridGlow: Phaser.GameObjects.Graphics;
    private readonly floorGrid: Phaser.GameObjects.Graphics;
    private readonly circuits: Phaser.GameObjects.Graphics;
    private readonly frameOuter: Phaser.GameObjects.Graphics;
    private readonly frameInner: Phaser.GameObjects.Graphics;
    private readonly scanBand: Phaser.GameObjects.Rectangle;
    private scanTween?: Phaser.Tweens.Tween;
    private glowTween?: Phaser.Tweens.Tween;
    private width = 0;
    private height = 0;

    constructor (private readonly scene: Phaser.Scene)
    {
        this.container = scene.add.container(0, 0).setDepth(BG_DEPTH).setScrollFactor(0);
        this.base = scene.add.graphics();
        this.gridGlow = scene.add.graphics();
        this.floorGrid = scene.add.graphics();
        this.circuits = scene.add.graphics();
        this.frameOuter = scene.add.graphics();
        this.frameInner = scene.add.graphics();
        this.scanBand = scene.add.rectangle(0, 0, 4, 4, CYBER.cyan, 0.035);
        this.scanBand.setOrigin(0.5, 0.5);
        this.scanBand.setBlendMode(BlendModes.ADD);

        this.container.add([
            this.base,
            this.gridGlow,
            this.floorGrid,
            this.circuits,
            this.scanBand,
            this.frameOuter,
            this.frameInner,
        ]);
    }

    resize (width: number, height: number, layout?: BoardLayout): void
    {
        this.width = width;
        this.height = height;
        this.redraw(layout);
        this.restartMotion();
    }

    destroy (): void
    {
        this.scanTween?.stop();
        this.glowTween?.stop();
        this.container.destroy();
    }

    private redraw (layout?: BoardLayout): void
    {
        const { width, height } = this;

        this.drawBase(width, height);
        this.drawGridGlow(width, height, layout);
        this.drawFloorGrid(width, height, layout);
        this.drawCircuits(width, height);
        this.drawFrame(width, height);

        this.scanBand.setSize(width * 1.2, Math.max(48, Math.round(height * 0.08)));
        this.scanBand.setPosition(width / 2, -this.scanBand.displayHeight / 2);
    }

    private drawBase (width: number, height: number): void
    {
        this.base.clear();

        this.base.fillStyle(CYBER.bg, 1);
        this.base.fillRect(0, 0, width, height);

        const horizon = height * 0.42;

        this.base.fillStyle(0x0a1424, 0.85);
        this.base.fillRect(0, horizon, width, height - horizon);

        this.base.fillStyle(CYBER.magenta, 0.035);
        this.base.fillEllipse(width * 0.18, height * 0.72, width * 0.55, height * 0.34);

        this.base.fillStyle(CYBER.cyan, 0.03);
        this.base.fillEllipse(width * 0.82, height * 0.28, width * 0.42, height * 0.24);

        this.drawScanlines(this.base, width, height);
    }

    private drawScanlines (graphics: Phaser.GameObjects.Graphics, width: number, height: number): void
    {
        graphics.lineStyle(1, 0x000000, 0.08);

        for (let y = 0; y < height; y += 4)
        {
            graphics.beginPath();
            graphics.moveTo(0, y);
            graphics.lineTo(width, y);
            graphics.strokePath();
        }
    }

    private drawGridGlow (width: number, height: number, layout?: BoardLayout): void
    {
        this.gridGlow.clear();

        const centerX = layout
            ? layout.gridOffsetX + layout.gridWidth / 2
            : width / 2;
        const centerY = layout
            ? layout.gridOffsetY + layout.gridHeight / 2
            : height * 0.46;
        const radius = Math.max(layout?.gridWidth ?? width * 0.35, width * 0.22);

        this.gridGlow.fillStyle(CYBER.cyan, 0.045);
        this.gridGlow.fillCircle(centerX, centerY, radius * 0.95);
        this.gridGlow.fillStyle(CYBER.magenta, 0.028);
        this.gridGlow.fillCircle(centerX, centerY, radius * 0.62);
    }

    private drawFloorGrid (width: number, height: number, layout?: BoardLayout): void
    {
        this.floorGrid.clear();

        const horizonY = height * 0.38;
        const floorTop = layout
            ? layout.gridOffsetY + layout.gridHeight + 24
            : height * 0.58;
        const vanishX = layout
            ? layout.gridOffsetX + layout.gridWidth / 2
            : width / 2;
        const vanishY = horizonY;
        const rows = 10;
        const cols = 18;

        this.floorGrid.lineStyle(1, CYBER.cyan, 0.08);

        for (let row = 1; row <= rows; row++)
        {
            const t = row / rows;
            const y = floorTop + (height - floorTop) * t * t;
            const spread = 0.12 + t * 0.88;

            this.floorGrid.beginPath();
            this.floorGrid.moveTo(vanishX - width * spread, y);
            this.floorGrid.lineTo(vanishX + width * spread, y);
            this.floorGrid.strokePath();
        }

        for (let col = -cols; col <= cols; col++)
        {
            const baseX = vanishX + (col / cols) * width * 0.42;

            this.floorGrid.beginPath();
            this.floorGrid.moveTo(vanishX, vanishY);
            this.floorGrid.lineTo(baseX, height + 8);
            this.floorGrid.strokePath();
        }

        if (layout)
        {
            const pad = 18;
            const left = layout.gridOffsetX - pad;
            const top = layout.gridOffsetY - pad;
            const panelW = layout.gridWidth + pad * 2;
            const panelH = layout.gridHeight + pad * 2;

            this.floorGrid.lineStyle(1, CYBER.cyan, 0.14);
            this.floorGrid.strokeRect(left, top, panelW, panelH);
        }
    }

    private drawCircuits (width: number, height: number): void
    {
        this.circuits.clear();

        const traces = 14;

        for (let i = 0; i < traces; i++)
        {
            const seed = i * 928371 + width * 13 + height * 7;
            const y = 24 + pseudo(seed) * height * 0.28;
            const startX = pseudo(seed + 1) * width * 0.35;
            const span = 80 + pseudo(seed + 2) * width * 0.45;
            const color = i % 3 === 0 ? CYBER.magenta : CYBER.cyan;
            const alpha = 0.08 + pseudo(seed + 3) * 0.12;

            this.circuits.lineStyle(1, color, alpha);
            this.circuits.beginPath();
            this.circuits.moveTo(startX, y);
            this.circuits.lineTo(startX + span, y);
            this.circuits.strokePath();

            const nodeX = startX + span * (0.35 + pseudo(seed + 4) * 0.4);

            this.circuits.fillStyle(color, alpha + 0.08);
            this.circuits.fillCircle(nodeX, y, 2.5);

            if (pseudo(seed + 5) > 0.55)
            {
                const drop = 10 + pseudo(seed + 6) * 28;

                this.circuits.beginPath();
                this.circuits.moveTo(nodeX, y);
                this.circuits.lineTo(nodeX, y + drop);
                this.circuits.strokePath();
            }
        }
    }

    private drawFrame (width: number, height: number): void
    {
        const inset = 16;
        const arm = Math.min(42, Math.round(Math.min(width, height) * 0.05));

        drawCornerBrackets(
            this.frameOuter,
            inset,
            inset,
            width - inset * 2,
            height - inset * 2,
            CYBER.cyan,
            { arm, alpha: 0.22, lineWidth: 1 },
        );

        drawCornerBrackets(
            this.frameInner,
            inset + 10,
            inset + 10,
            width - (inset + 10) * 2,
            height - (inset + 10) * 2,
            CYBER.magenta,
            { arm: Math.round(arm * 0.72), alpha: 0.12, lineWidth: 1 },
        );
    }

    private restartMotion (): void
    {
        this.scanTween?.stop();
        this.glowTween?.stop();

        this.scanBand.setY(-this.scanBand.displayHeight / 2);
        this.gridGlow.setAlpha(1);

        this.scanTween = this.scene.tweens.add({
            targets: this.scanBand,
            y: this.height + this.scanBand.displayHeight,
            duration: 6800,
            repeat: -1,
            ease: 'Linear',
        });

        this.glowTween = this.scene.tweens.add({
            targets: this.gridGlow,
            alpha: { from: 0.82, to: 1 },
            duration: 2400,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });
    }
}

const pseudo = (seed: number): number =>
{
    const x = Math.sin(seed * 12.9898) * 43758.5453;

    return x - Math.floor(x);
};
