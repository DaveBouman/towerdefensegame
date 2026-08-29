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
    private readonly vignette: Phaser.GameObjects.Graphics;
    private readonly gridGlow: Phaser.GameObjects.Graphics;
    private readonly pedestal: Phaser.GameObjects.Graphics;
    private readonly pedestalFrame: Phaser.GameObjects.Graphics;
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
        this.vignette = scene.add.graphics();
        this.gridGlow = scene.add.graphics();
        this.pedestal = scene.add.graphics();
        this.pedestalFrame = scene.add.graphics();
        this.floorGrid = scene.add.graphics();
        this.circuits = scene.add.graphics();
        this.frameOuter = scene.add.graphics();
        this.frameInner = scene.add.graphics();
        this.scanBand = scene.add.rectangle(0, 0, 4, 4, CYBER.magenta, 0.045);
        this.scanBand.setOrigin(0.5, 0.5);
        this.scanBand.setBlendMode(BlendModes.ADD);

        this.container.add([
            this.base,
            this.floorGrid,
            this.circuits,
            this.pedestal,
            this.pedestalFrame,
            this.gridGlow,
            this.scanBand,
            this.vignette,
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
        this.drawFloorGrid(width, height, layout);
        this.drawCircuits(width, height);
        this.drawPedestal(layout);
        this.drawGridGlow(width, height, layout);
        this.drawVignette(width, height);
        this.drawFrame(width, height);

        this.scanBand.setSize(width * 1.2, Math.max(56, Math.round(height * 0.09)));
        this.scanBand.setPosition(width / 2, -this.scanBand.displayHeight / 2);
    }

    private drawBase (width: number, height: number): void
    {
        this.base.clear();

        this.base.fillStyle(CYBER.bg, 1);
        this.base.fillRect(0, 0, width, height);

        // Layered sky → mid → floor washes (procedural depth, no art assets).
        this.base.fillStyle(0x160a18, 0.95);
        this.base.fillRect(0, 0, width, height * 0.36);

        this.base.fillStyle(0x100814, 0.88);
        this.base.fillRect(0, height * 0.28, width, height * 0.22);

        const horizon = height * 0.4;

        this.base.fillStyle(0x0a0610, 0.92);
        this.base.fillRect(0, horizon, width, height - horizon);

        this.base.fillStyle(CYBER.magenta, 0.07);
        this.base.fillEllipse(width * 0.2, height * 0.78, width * 0.62, height * 0.4);

        this.base.fillStyle(CYBER.gold, 0.05);
        this.base.fillEllipse(width * 0.78, height * 0.22, width * 0.48, height * 0.3);

        this.base.fillStyle(CYBER.cyan, 0.03);
        this.base.fillEllipse(width * 0.5, height * 0.5, width * 0.35, height * 0.2);

        this.drawScanlines(this.base, width, height);
    }

    private drawScanlines (graphics: Phaser.GameObjects.Graphics, width: number, height: number): void
    {
        graphics.lineStyle(1, 0x000000, 0.07);

        for (let y = 0; y < height; y += 3)
        {
            graphics.beginPath();
            graphics.moveTo(0, y);
            graphics.lineTo(width, y);
            graphics.strokePath();
        }
    }

    private drawVignette (width: number, height: number): void
    {
        this.vignette.clear();

        const edge = Math.max(48, Math.round(Math.min(width, height) * 0.08));

        this.vignette.fillStyle(0x000000, 0.28);
        this.vignette.fillRect(0, 0, width, edge);
        this.vignette.fillRect(0, height - edge, width, edge);
        this.vignette.fillRect(0, 0, edge, height);
        this.vignette.fillRect(width - edge, 0, edge, height);
    }

    private drawPedestal (layout?: BoardLayout): void
    {
        this.pedestal.clear();
        this.pedestalFrame.clear();

        if (!layout)
        {
            return;
        }

        const pad = 28;
        const left = layout.gridOffsetX - pad;
        const top = layout.gridOffsetY - pad;
        const panelW = layout.gridWidth + pad * 2;
        const panelH = layout.gridHeight + pad * 2;

        this.pedestal.fillStyle(0x08060e, 0.72);
        this.pedestal.fillRoundedRect(left, top, panelW, panelH, 10);

        this.pedestal.lineStyle(2, CYBER.magenta, 0.28);
        this.pedestal.strokeRoundedRect(left, top, panelW, panelH, 10);

        this.pedestal.lineStyle(1, CYBER.gold, 0.2);
        this.pedestal.strokeRoundedRect(left + 5, top + 5, panelW - 10, panelH - 10, 8);

        drawCornerBrackets(
            this.pedestalFrame,
            left - 2,
            top - 2,
            panelW + 4,
            panelH + 4,
            CYBER.cyan,
            { arm: 18, alpha: 0.35, lineWidth: 2 },
        );
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

        this.gridGlow.fillStyle(CYBER.magenta, 0.08);
        this.gridGlow.fillCircle(centerX, centerY, radius * 1.05);
        this.gridGlow.fillStyle(CYBER.gold, 0.05);
        this.gridGlow.fillCircle(centerX, centerY, radius * 0.68);
        this.gridGlow.fillStyle(CYBER.cyan, 0.035);
        this.gridGlow.fillCircle(centerX, centerY, radius * 0.38);
    }

    private drawFloorGrid (width: number, height: number, layout?: BoardLayout): void
    {
        this.floorGrid.clear();

        const horizonY = height * 0.36;
        const floorTop = layout
            ? layout.gridOffsetY + layout.gridHeight + 20
            : height * 0.58;
        const vanishX = layout
            ? layout.gridOffsetX + layout.gridWidth / 2
            : width / 2;
        const vanishY = horizonY;
        const rows = 12;
        const cols = 20;

        this.floorGrid.lineStyle(1, CYBER.magenta, 0.12);

        for (let row = 1; row <= rows; row++)
        {
            const t = row / rows;
            const y = floorTop + (height - floorTop) * t * t;
            const spread = 0.1 + t * 0.9;

            this.floorGrid.beginPath();
            this.floorGrid.moveTo(vanishX - width * spread, y);
            this.floorGrid.lineTo(vanishX + width * spread, y);
            this.floorGrid.strokePath();
        }

        for (let col = -cols; col <= cols; col++)
        {
            const baseX = vanishX + (col / cols) * width * 0.45;

            this.floorGrid.beginPath();
            this.floorGrid.moveTo(vanishX, vanishY);
            this.floorGrid.lineTo(baseX, height + 8);
            this.floorGrid.strokePath();
        }
    }

    private drawCircuits (width: number, height: number): void
    {
        this.circuits.clear();

        const traces = 18;

        for (let i = 0; i < traces; i++)
        {
            const seed = i * 928371 + width * 13 + height * 7;
            const y = 18 + pseudo(seed) * height * 0.32;
            const startX = pseudo(seed + 1) * width * 0.38;
            const span = 70 + pseudo(seed + 2) * width * 0.48;
            const color = i % 3 === 0 ? CYBER.gold : (i % 3 === 1 ? CYBER.magenta : CYBER.cyan);
            const alpha = 0.09 + pseudo(seed + 3) * 0.14;

            this.circuits.lineStyle(1, color, alpha);
            this.circuits.beginPath();
            this.circuits.moveTo(startX, y);
            this.circuits.lineTo(startX + span, y);
            this.circuits.strokePath();

            const nodeX = startX + span * (0.35 + pseudo(seed + 4) * 0.4);

            this.circuits.fillStyle(color, alpha + 0.1);
            this.circuits.fillCircle(nodeX, y, 2.8);

            if (pseudo(seed + 5) > 0.5)
            {
                const drop = 10 + pseudo(seed + 6) * 32;

                this.circuits.beginPath();
                this.circuits.moveTo(nodeX, y);
                this.circuits.lineTo(nodeX, y + drop);
                this.circuits.strokePath();
            }
        }
    }

    private drawFrame (width: number, height: number): void
    {
        const inset = 14;
        const arm = Math.min(46, Math.round(Math.min(width, height) * 0.055));

        drawCornerBrackets(
            this.frameOuter,
            inset,
            inset,
            width - inset * 2,
            height - inset * 2,
            CYBER.magenta,
            { arm, alpha: 0.28, lineWidth: 1 },
        );

        drawCornerBrackets(
            this.frameInner,
            inset + 10,
            inset + 10,
            width - (inset + 10) * 2,
            height - (inset + 10) * 2,
            CYBER.gold,
            { arm: Math.round(arm * 0.72), alpha: 0.2, lineWidth: 1 },
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
            duration: 7200,
            repeat: -1,
            ease: 'Linear',
        });

        this.glowTween = this.scene.tweens.add({
            targets: this.gridGlow,
            alpha: { from: 0.78, to: 1 },
            duration: 2600,
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
