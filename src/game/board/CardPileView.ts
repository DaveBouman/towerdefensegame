import { getGameCursors } from '../ui/gameCursors';
import { buildCardBackGraphic } from '../cards/CardRenderer';
import { PILE_CARD_HEIGHT, PILE_CARD_WIDTH } from '../cards/cardVisuals';
import { CYBER } from '../config/cyberpunkTheme';
import { drawCornerBrackets, drawNeonPanel } from '../config/cyberpunkUiGraphics';
import { uiDisplayTextStyle, uiTextStyle } from '../config/uiTypography';
import type { CardInstance } from '../cardGame/domain/types';
import type { BoardLayout } from './boardLayout';

/** How many face-down cards to show for a given pile size (board-game thickness). */
const stackDepthForCount = (count: number): number =>
{
    if (count <= 0)
    {
        return 0;
    }

    if (count === 1)
    {
        return 1;
    }

    if (count <= 3)
    {
        return 2;
    }

    if (count <= 7)
    {
        return 3;
    }

    if (count <= 14)
    {
        return 4;
    }

    if (count <= 24)
    {
        return 5;
    }

    return 6;
};

const MAX_VISIBLE_STACK = 6;
/** Diagonal offset so the stack reads as a real pile of cards. */
const STACK_OFFSET_X = 4;
const STACK_OFFSET_Y = 4;
const WELL_PAD = 6;
const EXHAUST_BADGE_W = 38;
const EXHAUST_BADGE_H = 24;
const COUNT_BADGE_W = 32;
const COUNT_BADGE_H = 24;

export class CardPileView
{
    readonly container: Phaser.GameObjects.Container;
    private readonly titleText: Phaser.GameObjects.Text;
    private readonly stackContainer: Phaser.GameObjects.Container;
    private readonly stackSlots: Phaser.GameObjects.Container[] = [];
    private readonly stackShadow: Phaser.GameObjects.Rectangle;
    private readonly emptyHint: Phaser.GameObjects.Text;
    private readonly frameHitArea: Phaser.GameObjects.Rectangle;
    private readonly countBadge: Phaser.GameObjects.Container;
    private readonly countBadgeText: Phaser.GameObjects.Text;
    private count = 0;
    private exhaustCount = 0;
    private readonly kind: 'deck' | 'graveyard' | 'exhaust';
    private readonly accent: number;
    private exhaustBadge?: Phaser.GameObjects.Container;
    private exhaustBadgeBg?: Phaser.GameObjects.Rectangle;
    private exhaustBadgeText?: Phaser.GameObjects.Text;
    private exhaustBadgeHit?: Phaser.GameObjects.Rectangle;

    constructor (
        private readonly scene: Phaser.Scene,
        layout: BoardLayout,
        x: number,
        y: number,
        label: string,
        kind: 'deck' | 'graveyard' | 'exhaust',
    )
    {
        this.kind = kind;
        const { pileWidth, pileHeight } = layout;
        const fill = kind === 'deck'
            ? CYBER.deckFill
            : kind === 'exhaust'
                ? CYBER.exhaustFill
                : CYBER.graveFill;
        this.accent = kind === 'deck'
            ? CYBER.deckBorder
            : kind === 'exhaust'
                ? CYBER.exhaustBorder
                : CYBER.graveBorder;
        const frameW = pileWidth + 10;
        const frameH = pileHeight + 22;
        const cardOptions = {
            width: PILE_CARD_WIDTH,
            height: PILE_CARD_HEIGHT,
        };

        this.container = scene.add.container(x, y);

        const frame = scene.add.graphics();

        // Quiet tray — cards are the hero, not the chrome box.
        drawNeonPanel(frame, 0, 0, frameW, frameH, fill, this.accent, 0.72, 0.35);

        const brackets = scene.add.graphics();

        drawCornerBrackets(brackets, 3, 3, frameW - 6, frameH - 6, this.accent, {
            arm: 9,
            alpha: 0.45,
            lineWidth: 1.5,
        });

        const maxStackDepthX = (MAX_VISIBLE_STACK - 1) * STACK_OFFSET_X;
        const maxStackDepthY = (MAX_VISIBLE_STACK - 1) * STACK_OFFSET_Y;
        const stackX = Math.round((frameW - PILE_CARD_WIDTH - maxStackDepthX) / 2);
        const stackY = Math.round((pileHeight - PILE_CARD_HEIGHT - maxStackDepthY) / 2) + WELL_PAD - 2;

        this.stackShadow = scene.add.rectangle(
            stackX + PILE_CARD_WIDTH / 2 + 4,
            stackY + PILE_CARD_HEIGHT / 2 + 5,
            PILE_CARD_WIDTH + 4,
            PILE_CARD_HEIGHT + 4,
            0x000000,
            0.35,
        );
        this.stackShadow.setVisible(false);

        this.stackContainer = scene.add.container(stackX, stackY);

        for (let i = 0; i < MAX_VISIBLE_STACK; i++)
        {
            const slot = scene.add.container(0, 0);
            const { container: graphic } = buildCardBackGraphic(scene, cardOptions, this.accent);

            slot.add(graphic);
            slot.setVisible(false);
            this.stackSlots.push(slot);
            this.stackContainer.add(slot);
        }

        this.emptyHint = scene.add.text(frameW / 2, stackY + PILE_CARD_HEIGHT / 2, '—', {
            ...uiTextStyle(18, '#5a5060', { bold: true }),
        }).setOrigin(0.5);

        this.titleText = scene.add.text(frameW / 2, pileHeight + 10, label, {
            ...uiTextStyle(13, kind === 'deck' ? '#7af0ff' : kind === 'exhaust' ? '#d8b8ff' : '#ffd4b8', { bold: true }),
        }).setOrigin(0.5, 0);

        const countBg = scene.add.rectangle(0, 0, COUNT_BADGE_W, COUNT_BADGE_H, 0x0a0a14, 0.94);

        countBg.setStrokeStyle(2, this.accent, 0.95);

        this.countBadgeText = scene.add.text(0, 0, '0', {
            ...uiDisplayTextStyle(15, '#ffffff', { bold: true }),
        }).setOrigin(0.5);

        this.countBadge = scene.add.container(
            stackX + PILE_CARD_WIDTH - 2,
            stackY + 8,
            [ countBg, this.countBadgeText ],
        );
        this.countBadge.setVisible(false);

        this.container.add([
            frame,
            brackets,
            this.stackShadow,
            this.stackContainer,
            this.emptyHint,
            this.titleText,
            this.countBadge,
        ]);
        this.applyStack(0);

        if (kind === 'graveyard')
        {
            this.buildExhaustBadge(scene, frameW);
        }

        const hitArea = scene.add.rectangle(0, 0, frameW, frameH, 0x000000, 0);

        hitArea.setOrigin(0, 0);
        hitArea.setInteractive({ cursor: getGameCursors().pointer });
        this.frameHitArea = hitArea;
        this.container.add(hitArea);

        this.container.bringToTop(this.countBadge);

        if (this.exhaustBadge)
        {
            this.container.bringToTop(this.exhaustBadge);
        }
    }

    private buildExhaustBadge (scene: Phaser.Scene, frameW: number): void
    {
        const badgeX = frameW - EXHAUST_BADGE_W / 2 - 2;
        const badgeY = EXHAUST_BADGE_H / 2 + 2;
        const bg = scene.add.rectangle(0, 0, EXHAUST_BADGE_W, EXHAUST_BADGE_H, CYBER.exhaustFill, 0.95);

        bg.setStrokeStyle(1.5, CYBER.exhaustBorder, 0.95);

        const label = scene.add.text(-1, -5, 'EX', {
            ...uiTextStyle(8, '#d8b8ff', { bold: true }),
        }).setOrigin(0.5, 0.5);

        const value = scene.add.text(0, 5, '0', {
            ...uiDisplayTextStyle(11, '#f0e4ff', { bold: true }),
        }).setOrigin(0.5, 0.5);

        const hit = scene.add.rectangle(0, 0, EXHAUST_BADGE_W + 4, EXHAUST_BADGE_H + 4, 0x000000, 0);

        hit.setInteractive({ cursor: getGameCursors().pointer });

        this.exhaustBadgeBg = bg;
        this.exhaustBadgeText = value;
        this.exhaustBadgeHit = hit;
        this.exhaustBadge = scene.add.container(badgeX, badgeY, [ bg, label, value, hit ]);
        this.exhaustBadge.setVisible(false);
        this.container.add(this.exhaustBadge);
    }

    /** Makes the pile clickable to inspect its contents. Pass `null` to disable. */
    setClickHandler (handler: (() => void) | null): void
    {
        this.frameHitArea.removeAllListeners();

        if (!handler)
        {
            this.frameHitArea.disableInteractive();

            return;
        }

        this.frameHitArea.setInteractive({ cursor: getGameCursors().pointer });
        this.frameHitArea.on('pointerover', () =>
        {
            this.scene.tweens.add({
                targets: this.container,
                scaleX: 1.04,
                scaleY: 1.04,
                duration: 120,
                ease: 'Quad.easeOut',
            });
        });
        this.frameHitArea.on('pointerout', () =>
        {
            this.scene.tweens.add({
                targets: this.container,
                scaleX: 1,
                scaleY: 1,
                duration: 120,
                ease: 'Quad.easeOut',
            });
        });
        this.frameHitArea.on('pointerdown', () =>
        {
            handler();
        });
    }

    /** Graveyard only: click the EX badge to inspect exhausted cards. */
    setExhaustClickHandler (handler: (() => void) | null): void
    {
        if (!this.exhaustBadgeHit)
        {
            return;
        }

        this.exhaustBadgeHit.removeAllListeners();

        if (!handler)
        {
            this.exhaustBadgeHit.disableInteractive();

            return;
        }

        this.exhaustBadgeHit.setInteractive({ cursor: getGameCursors().pointer });
        this.exhaustBadgeHit.on('pointerover', () =>
        {
            this.exhaustBadgeBg?.setStrokeStyle(2, CYBER.purple, 1);
        });
        this.exhaustBadgeHit.on('pointerout', () =>
        {
            this.exhaustBadgeBg?.setStrokeStyle(1.5, CYBER.exhaustBorder, 0.95);
        });
        this.exhaustBadgeHit.on('pointerdown', (pointer: Phaser.Input.Pointer) =>
        {
            pointer.event?.stopPropagation?.();
            handler();
        });
    }

    getReceivePosition (): { x: number; y: number }
    {
        const matrix = this.stackContainer.getWorldTransformMatrix();
        const depth = Math.max(0, stackDepthForCount(this.count) - 1);

        return {
            x: matrix.tx + depth * STACK_OFFSET_X + PILE_CARD_WIDTH / 2,
            y: matrix.ty + depth * STACK_OFFSET_Y + PILE_CARD_HEIGHT / 2,
        };
    }

    /** Fly target for exhausted cards — badge when present, else stack. */
    getExhaustReceivePosition (): { x: number; y: number }
    {
        if (this.exhaustBadge?.active && this.exhaustCount > 0)
        {
            const matrix = this.exhaustBadge.getWorldTransformMatrix();

            return { x: matrix.tx, y: matrix.ty };
        }

        if (this.exhaustBadge?.active)
        {
            const matrix = this.exhaustBadge.getWorldTransformMatrix();

            return { x: matrix.tx, y: matrix.ty };
        }

        return this.getReceivePosition();
    }

    setCount (count: number): void
    {
        if (!this.isActive())
        {
            return;
        }

        this.applyStack(count);
    }

    setStack (count: number, _previewCard: CardInstance | null): void
    {
        if (!this.isActive())
        {
            return;
        }

        // Always face-down backs — reads as a real board-game pile.
        this.applyStack(count);
    }

    /** Updates the EX number on the graveyard pile (hidden at 0). */
    setExhaustCount (count: number): void
    {
        if (!this.isActive() || !this.exhaustBadge || !this.exhaustBadgeText)
        {
            return;
        }

        this.exhaustCount = Math.max(0, count);
        this.exhaustBadgeText.setText(String(this.exhaustCount));
        this.exhaustBadge.setVisible(this.exhaustCount > 0);
    }

    pulse (): void
    {
        if (!this.isActive())
        {
            return;
        }

        this.scene.tweens.killTweensOf(this.container);
        this.container.setScale(1);

        this.scene.tweens.add({
            targets: this.container,
            scaleX: 1.08,
            scaleY: 1.08,
            duration: 140,
            yoyo: true,
            ease: 'Quad.easeOut',
        });
    }

    /** Pulse only the exhaust badge when cards fly into it. */
    pulseExhaustBadge (): void
    {
        if (!this.isActive() || !this.exhaustBadge?.active)
        {
            return;
        }

        this.exhaustBadge.setVisible(true);
        this.scene.tweens.killTweensOf(this.exhaustBadge);
        this.exhaustBadge.setScale(1);

        this.scene.tweens.add({
            targets: this.exhaustBadge,
            scaleX: 1.22,
            scaleY: 1.22,
            duration: 150,
            yoyo: true,
            ease: 'Back.easeOut',
        });
    }

    destroy (): void
    {
        this.container.destroy();
    }

    private isActive (): boolean
    {
        return this.container.active && this.scene.sys !== null;
    }

    private applyStack (count: number): void
    {
        this.count = Math.max(0, count);
        this.countBadgeText.setText(String(this.count));
        this.countBadge.setVisible(this.count > 0);
        this.emptyHint.setVisible(this.count === 0);
        this.stackShadow.setVisible(this.count > 0);

        const depth = stackDepthForCount(this.count);
        const cardOptions = {
            width: PILE_CARD_WIDTH,
            height: PILE_CARD_HEIGHT,
        };

        for (let i = 0; i < this.stackSlots.length; i++)
        {
            const slot = this.stackSlots[i]!;
            const isVisible = i < depth;

            slot.setVisible(isVisible);

            if (!isVisible)
            {
                continue;
            }

            slot.setPosition(i * STACK_OFFSET_X, i * STACK_OFFSET_Y);
            slot.removeAll(true);

            const { container } = buildCardBackGraphic(this.scene, cardOptions, this.accent);

            // Slightly dim lower cards so the top of the pile pops.
            const depthFade = 0.72 + (i / Math.max(1, depth - 1)) * 0.28;

            container.setAlpha(depth === 1 ? 1 : depthFade);
            slot.add(container);
        }

        const topOffsetX = Math.max(0, depth - 1) * STACK_OFFSET_X;
        const topOffsetY = Math.max(0, depth - 1) * STACK_OFFSET_Y;

        this.countBadge.setPosition(
            this.stackContainer.x + topOffsetX + PILE_CARD_WIDTH - 4,
            this.stackContainer.y + topOffsetY + 10,
        );
        this.stackShadow.setPosition(
            this.stackContainer.x + topOffsetX + PILE_CARD_WIDTH / 2 + 5,
            this.stackContainer.y + topOffsetY + PILE_CARD_HEIGHT / 2 + 6,
        );
        this.stackShadow.setSize(
            PILE_CARD_WIDTH + 6 + Math.max(0, depth - 1) * 0.5,
            PILE_CARD_HEIGHT + 6,
        );
    }
}
