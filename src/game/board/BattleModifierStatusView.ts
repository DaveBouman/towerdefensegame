import type { BattleModifier } from '../cardGame/combat/battleModifiers';
import {
    formatModifierBadgeLabel,
    summarizeBattleModifiers,
    type BattleModifierDisplayEntry,
} from '../cardGame/combat/battleModifierDisplay';
import { CYBER } from '../config/cyberpunkTheme';
import { uiDisplayTextStyle } from '../config/uiTypography';
import {
    attachDomTooltip,
    getGameTooltipController,
} from '../cardGame/presentation/tooltips/GameTooltipController';
import type { BoardLayout } from './boardLayout';

const ICON_SIZE = 22;
const ICON_GAP = 6;
const BADGE_FONT_SIZE = 11;

export class BattleModifierStatusView
{
    readonly container: Phaser.GameObjects.Container;
    private iconsContainer?: Phaser.GameObjects.Container;
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
        getGameTooltipController(this.scene).hide();
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
        getGameTooltipController(this.scene).hide();
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
            ...uiDisplayTextStyle(BADGE_FONT_SIZE, entry.textColor, {
                bold: true,
                strokeColor: '#0a0a14',
            }),
        }).setOrigin(0.5, 0);

        parts.push(label);

        attachDomTooltip(this.scene, hitArea, () => ({
            title: entry.tooltipTitle,
            lines: entry.tooltipLines,
        }));

        hitArea.on('pointerover', () =>
        {
            ring.setStrokeStyle(2, CYBER.yellow, 1);
        });
        hitArea.on('pointerout', () =>
        {
            ring.setStrokeStyle(2, entry.tint, 0.95);
        });

        return parts;
    }
}
