import { getGameCursors } from '../ui/gameCursors';
import { Actions, Geom } from 'phaser';
import { buildCardBackGraphic, buildCardGraphic } from '../cards/CardRenderer';
import { PILE_CARD_HEIGHT, PILE_CARD_WIDTH } from '../cards/cardVisuals';
import { CYBER } from '../config/cyberpunkTheme';
import { drawCornerBrackets, drawNeonPanel } from '../config/cyberpunkUiGraphics';
import { uiDisplayTextStyle, uiTextStyle } from '../config/uiTypography';
import type { CardInstance } from '../cardGame/domain/types';
import type { BoardLayout } from './boardLayout';

const MAX_VISIBLE_STACK = 4;
const STACK_OFFSET = 2;
const WELL_PAD = 6;

export class CardPileView
{
    readonly container: Phaser.GameObjects.Container;
    private readonly countText: Phaser.GameObjects.Text;
    private readonly stackContainer: Phaser.GameObjects.Container;
    private readonly stackSlots: Phaser.GameObjects.Container[] = [];
    private readonly frame: Phaser.GameObjects.Graphics;
    private readonly frameHitArea: Phaser.GameObjects.Rectangle;
    private count = 0;
    private readonly kind: 'deck' | 'graveyard' | 'exhaust';

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
        const border = kind === 'deck'
            ? CYBER.deckBorder
            : kind === 'exhaust'
                ? CYBER.exhaustBorder
                : CYBER.graveBorder;
        const frameW = pileWidth + 12;
        const frameH = pileHeight + 34;
        const cardOptions = {
            width: PILE_CARD_WIDTH,
            height: PILE_CARD_HEIGHT,
        };

        this.container = scene.add.container(x, y);

        const frame = scene.add.graphics();

        drawNeonPanel(frame, 0, 0, frameW, frameH, fill, border, 0.96, 0.72);
        this.frame = frame;

        const well = scene.add.graphics();

        well.fillStyle(0x060a12, 0.92);
        well.fillRect(WELL_PAD, WELL_PAD, pileWidth, pileHeight);
        well.lineStyle(1, border, 0.18);

        for (let xLine = WELL_PAD; xLine <= WELL_PAD + pileWidth; xLine += 12)
        {
            well.beginPath();
            well.moveTo(xLine, WELL_PAD);
            well.lineTo(xLine, WELL_PAD + pileHeight);
            well.strokePath();
        }

        for (let yLine = WELL_PAD; yLine <= WELL_PAD + pileHeight; yLine += 12)
        {
            well.beginPath();
            well.moveTo(WELL_PAD, yLine);
            well.lineTo(WELL_PAD + pileWidth, yLine);
            well.strokePath();
        }

        const brackets = scene.add.graphics();

        drawCornerBrackets(brackets, 4, 4, frameW - 8, frameH - 8, border, { arm: 10, alpha: 0.8 });

        const accent = scene.add.graphics();

        accent.fillStyle(border, 0.35);
        accent.fillRect(0, 0, frameW, 2);
        accent.fillStyle(border, 0.12);
        accent.fillRect(0, frameH - 3, frameW, 1);

        const maxStackDepth = (MAX_VISIBLE_STACK - 1) * STACK_OFFSET;
        const stackX = Math.round((frameW - PILE_CARD_WIDTH - maxStackDepth) / 2);
        const stackY = Math.round((pileHeight - PILE_CARD_HEIGHT - maxStackDepth) / 2) + WELL_PAD;

        this.stackContainer = scene.add.container(stackX, stackY);

        Actions.AddMaskShape(this.stackContainer, {
            shape: 'rectangle',
            region: new Geom.Rectangle(
                WELL_PAD - stackX,
                WELL_PAD - stackY,
                pileWidth,
                pileHeight,
            ),
            useInternal: true,
        });

        for (let i = 0; i < MAX_VISIBLE_STACK; i++)
        {
            const offset = i * STACK_OFFSET;
            const slot = scene.add.container(offset, offset);
            const { container: graphic } = buildCardBackGraphic(
                scene,
                cardOptions,
                kind === 'deck' ? CYBER.cyan : kind === 'exhaust' ? CYBER.purple : CYBER.graveBorder,
            );

            slot.add(graphic);
            slot.setVisible(false);
            this.stackSlots.push(slot);
            this.stackContainer.add(slot);
        }

        this.countText = scene.add.text(pileWidth / 2 + 6, pileHeight + 16, '0', {
            ...uiDisplayTextStyle(20, '#ffffff', { bold: true }),
        }).setOrigin(0.5, 0);

        const title = scene.add.text(pileWidth / 2 + 6, pileHeight + 36, label, {
            ...uiTextStyle(13, kind === 'deck' ? '#7af0ff' : kind === 'exhaust' ? '#d8b8ff' : '#ffd4b8', { bold: true }),
        }).setOrigin(0.5, 0);

        this.container.add([ frame, well, brackets, accent, this.stackContainer, this.countText, title ]);
        this.applyStack(0, null);

        const hitArea = scene.add.rectangle(0, 0, frameW, frameH, 0x000000, 0);

        hitArea.setOrigin(0, 0);
        hitArea.setInteractive({ cursor: getGameCursors().pointer });
        this.frameHitArea = hitArea;
        this.container.add(hitArea);
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

    getReceivePosition (): { x: number; y: number }
    {
        const matrix = this.stackContainer.getWorldTransformMatrix();

        return { x: matrix.tx, y: matrix.ty };
    }

    setCount (count: number): void
    {
        if (!this.isActive())
        {
            return;
        }

        this.applyStack(count, null);
    }

    setStack (count: number, previewCard: CardInstance | null): void
    {
        if (!this.isActive())
        {
            return;
        }

        this.applyStack(count, previewCard);
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

    destroy (): void
    {
        this.container.destroy();
    }

    private isActive (): boolean
    {
        return this.container.active && this.scene.sys !== null;
    }

    private applyStack (count: number, previewCard: CardInstance | null): void
    {
        this.count = Math.max(0, count);
        this.countText.setText(String(this.count));

        const cardOptions = {
            width: PILE_CARD_WIDTH,
            height: PILE_CARD_HEIGHT,
        };
        const visibleCards = Math.min(this.count, MAX_VISIBLE_STACK);
        const showTopFace = this.kind !== 'deck' && previewCard !== null;

        for (let i = 0; i < this.stackSlots.length; i++)
        {
            const slot = this.stackSlots[i]!;
            const isVisible = i < visibleCards;
            const isTop = isVisible && i === visibleCards - 1;

            slot.setVisible(isVisible);

            if (!isVisible)
            {
                continue;
            }

            slot.removeAll(true);

            if (isTop && showTopFace)
            {
                const { container } = buildCardGraphic(this.scene, previewCard!, cardOptions);

                slot.add(container);
            }
            else
            {
                const { container } = buildCardBackGraphic(
                    this.scene,
                    cardOptions,
                    this.kind === 'deck' ? CYBER.cyan : this.kind === 'exhaust' ? CYBER.purple : CYBER.graveBorder,
                );

                slot.add(container);
            }
        }
    }
}
