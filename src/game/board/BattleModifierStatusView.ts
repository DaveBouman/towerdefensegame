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
import { COMBAT_TRAIT_ICON_SIZE, COMBAT_TRAIT_ROW_BELOW_LABEL } from './CombatTraitRowView';
import { computeEnemySlots } from './enemySquadLayout';

const ICON_SIZE = 22;
const ICON_GAP = 6;
const BADGE_FONT_SIZE = 11;
/** Clears name label + trait row so chips sit under the combatant panel. */
const BELOW_PANEL_OFFSET = 16 + COMBAT_TRAIT_ROW_BELOW_LABEL + COMBAT_TRAIT_ICON_SIZE + 10;

export class BattleModifierStatusView
{
    private readonly playerContainer: Phaser.GameObjects.Container;
    private readonly enemyContainer: Phaser.GameObjects.Container;
    private playerIcons?: Phaser.GameObjects.Container;
    private enemyIcons?: Phaser.GameObjects.Container;
    private enemyCount = 1;

    constructor (
        private readonly scene: Phaser.Scene,
        layout: BoardLayout,
        enemyCount = 1,
    )
    {
        this.enemyCount = Math.max(1, enemyCount);
        this.playerContainer = scene.add.container(0, 0);
        this.enemyContainer = scene.add.container(0, 0);
        this.playerContainer.setDepth(480);
        this.enemyContainer.setDepth(480);
        this.reposition(layout, this.enemyCount);
    }

    reposition (layout: BoardLayout, enemyCount = this.enemyCount): void
    {
        this.enemyCount = Math.max(1, enemyCount);

        this.playerContainer.setPosition(
            layout.playerX + layout.playerSize / 2,
            layout.playerY + layout.playerSize + BELOW_PANEL_OFFSET,
        );

        const slots = computeEnemySlots(layout, this.enemyCount);
        const first = slots[0]!;
        const last = slots[slots.length - 1]!;
        const centerX = (first.x + last.x + last.size) / 2;

        this.enemyContainer.setPosition(
            centerX,
            first.y + first.size + BELOW_PANEL_OFFSET,
        );
    }

    setModifiers (modifiers: readonly BattleModifier[]): void
    {
        getGameTooltipController(this.scene).hide();
        this.playerIcons?.destroy();
        this.enemyIcons?.destroy();
        this.playerIcons = undefined;
        this.enemyIcons = undefined;

        const entries = summarizeBattleModifiers(modifiers);
        const playerEntries = entries.filter((entry) => entry.anchor === 'player');
        const enemyEntries = entries.filter((entry) => entry.anchor === 'enemy');

        this.playerIcons = this.mountRow(this.playerContainer, playerEntries);
        this.enemyIcons = this.mountRow(this.enemyContainer, enemyEntries);
    }

    destroy (): void
    {
        getGameTooltipController(this.scene).hide();
        this.playerContainer.destroy();
        this.enemyContainer.destroy();
    }

    private mountRow (
        parent: Phaser.GameObjects.Container,
        entries: readonly BattleModifierDisplayEntry[],
    ): Phaser.GameObjects.Container | undefined
    {
        if (entries.length === 0)
        {
            return undefined;
        }

        const rowWidth = entries.length * ICON_SIZE + (entries.length - 1) * ICON_GAP;
        const startX = -rowWidth / 2 + ICON_SIZE / 2;
        const parts: Phaser.GameObjects.GameObject[] = [];

        entries.forEach((entry, index) =>
        {
            parts.push(...this.buildIcon(entry, startX + index * (ICON_SIZE + ICON_GAP), 0));
        });

        const row = this.scene.add.container(0, 0, parts);

        parent.add(row);

        return row;
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
