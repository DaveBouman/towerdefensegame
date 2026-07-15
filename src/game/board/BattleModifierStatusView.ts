import type { BattleModifier } from '../cardGame/combat/battleModifiers';
import {
    formatModifierBadgeLabel,
    summarizeBattleModifiers,
    type BattleModifierDisplayEntry,
} from '../cardGame/combat/battleModifierDisplay';
import { CYBER } from '../config/cyberpunkTheme';
import { uiDisplayTextStyle } from '../config/uiTypography';
import type { BoardLayout } from './boardLayout';

const ICON_SIZE = 22;
const ICON_GAP = 6;
const BADGE_FONT_SIZE = 11;

export class BattleModifierStatusView
{
    readonly container: Phaser.GameObjects.Container;
    private iconsContainer?: Phaser.GameObjects.Container;
    private tooltip?: Phaser.GameObjects.Container;
    private playerSize = 0;

    constructor (
        private readonly scene: Phaser.Scene,
        layout: BoardLayout,
    )
    {
        this.playerSize = layout.playerSize;
        this.container = scene.add.container(
            layout.playerX + layout.playerSize / 2,
            layout.playerY - 34,
        );
        this.container.setDepth(480);
    }

    reposition (layout: BoardLayout): void
    {
        this.playerSize = layout.playerSize;
        this.container.setPosition(
            layout.playerX + layout.playerSize / 2,
            layout.playerY - 34,
        );
    }

    setModifiers (modifiers: readonly BattleModifier[]): void
    {
        this.hideTooltip();
        this.iconsContainer?.destroy();
        this.iconsContainer = undefined;

        const entries = summarizeBattleModifiers(modifiers);

        if (entries.length === 0)
        {
            return;
        }

        const rowWidth = entries.length * ICON_SIZE + (entries.length - 1) * ICON_GAP;
        const startX = -rowWidth / 2 + ICON_SIZE / 2;
        const parts: Phaser.GameObjects.GameObject[] = [];

        entries.forEach((entry, index) =>
        {
            parts.push(...this.buildIcon(entry, startX + index * (ICON_SIZE + ICON_GAP), 0));
        });

        this.iconsContainer = this.scene.add.container(0, 0, parts);
        this.container.add(this.iconsContainer);
    }

    destroy (): void
    {
        this.hideTooltip();
        this.container.destroy();
    }

    private buildIcon (
        entry: BattleModifierDisplayEntry,
        x: number,
        y: number,
    ): Phaser.GameObjects.GameObject[]
    {
        const hitArea = this.scene.add.circle(x, y, ICON_SIZE / 2 + 2, 0x000000, 0);
        const ring = this.scene.add.circle(x, y, ICON_SIZE / 2 + 1, 0x141425, 0.92);

        ring.setStrokeStyle(2, entry.tint, 0.95);

        const parts: Phaser.GameObjects.GameObject[] = [ ring, hitArea ];

        if (this.scene.textures.exists(entry.textureKey))
        {
            const icon = this.scene.add.image(x, y - 3, entry.textureKey);
            icon.setDisplaySize(ICON_SIZE - 4, ICON_SIZE - 4);
            icon.setOrigin(0.5);
            icon.setTint(entry.tint);
            parts.push(icon);
        }

        const label = this.scene.add.text(x, y + ICON_SIZE / 2 - 1, formatModifierBadgeLabel(entry.delta), {
            ...uiDisplayTextStyle(BADGE_FONT_SIZE, entry.tint, {
                bold: true,
                strokeColor: '#0a0a14',
            }),
        }).setOrigin(0.5, 0);

        parts.push(label);

        hitArea.setInteractive({ useHandCursor: true });
        hitArea.on('pointerover', () =>
        {
            ring.setStrokeStyle(2, CYBER.yellow, 1);
            this.showTooltip(entry, x, y - ICON_SIZE);
        });
        hitArea.on('pointerout', () =>
        {
            ring.setStrokeStyle(2, entry.tint, 0.95);
            this.hideTooltip();
        });

        return parts;
    }

    private showTooltip (entry: BattleModifierDisplayEntry, x: number, y: number): void
    {
        this.hideTooltip();

        const title = this.scene.add.text(0, 0, entry.tooltipTitle, {
            ...uiDisplayTextStyle(13, entry.tint, { bold: true }),
        }).setOrigin(0, 0);
        const lines = entry.tooltipLines.map((line, index) =>
            this.scene.add.text(0, 18 + index * 16, line, {
                ...uiDisplayTextStyle(11, '#d8d8ee'),
            }).setOrigin(0, 0),
        );
        const width = Math.max(title.width, ...lines.map((line) => line.width)) + 16;
        const height = 18 + lines.length * 16 + 10;
        const background = this.scene.add.rectangle(
            width / 2,
            height / 2,
            width,
            height,
            0x101018,
            0.96,
        );

        background.setStrokeStyle(1.5, entry.tint, 0.8);

        this.tooltip = this.scene.add.container(x, y, [ background, title, ...lines ]);
        this.tooltip.setDepth(600);
        this.container.add(this.tooltip);
        this.container.bringToTop(this.tooltip);
    }

    private hideTooltip (): void
    {
        this.tooltip?.destroy();
        this.tooltip = undefined;
    }
}
