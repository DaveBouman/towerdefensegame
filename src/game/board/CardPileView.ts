import { buildCardBackGraphic, buildCardGraphic } from '../cards/CardRenderer';
import { PILE_CARD_HEIGHT, PILE_CARD_WIDTH } from '../cards/cardVisuals';
import { CYBER } from '../config/cyberpunkTheme';
import { drawCornerBrackets } from '../config/cyberpunkUiGraphics';
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
    private readonly frame: Phaser.GameObjects.Rectangle;
    private frameBorder = 0xffffff;
    private count = 0;
    private readonly kind: 'deck' | 'graveyard';

    constructor (
        private readonly scene: Phaser.Scene,
        layout: BoardLayout,
        x: number,
        y: number,
        label: string,
        kind: 'deck' | 'graveyard',
    )
    {
        this.kind = kind;
        const { pileWidth, pileHeight } = layout;
        const fill = kind === 'deck' ? CYBER.deckFill : CYBER.graveFill;
        const border = kind === 'deck' ? CYBER.deckBorder : CYBER.graveBorder;
        const frameW = pileWidth + 12;
        const frameH = pileHeight + 34;
        const cardOptions = {
            width: PILE_CARD_WIDTH,
            height: PILE_CARD_HEIGHT,
        };

        this.container = scene.add.container(x, y);

        const frame = scene.add.rectangle(0, 0, frameW, frameH, fill, 0.94);

        frame.setOrigin(0, 0);
        frame.setStrokeStyle(2, border, 0.95);
        this.frame = frame;
        this.frameBorder = border;

        const brackets = scene.add.graphics();

        drawCornerBrackets(brackets, 4, 4, frameW - 8, frameH - 8, border, { arm: 10, alpha: 0.8 });

        const maxStackDepth = (MAX_VISIBLE_STACK - 1) * STACK_OFFSET;
        const stackX = Math.round((frameW - PILE_CARD_WIDTH - maxStackDepth) / 2);
        const stackY = Math.round((pileHeight - PILE_CARD_HEIGHT - maxStackDepth) / 2) + WELL_PAD;

        this.stackContainer = scene.add.container(stackX, stackY);

        const stackMaskShape = scene.add.graphics();

        stackMaskShape.fillStyle(0xffffff);
        stackMaskShape.fillRect(WELL_PAD, WELL_PAD, pileWidth, pileHeight);
        stackMaskShape.setVisible(false);
        this.stackContainer.setMask(stackMaskShape.createGeometryMask());

        for (let i = 0; i < MAX_VISIBLE_STACK; i++)
        {
            const offset = i * STACK_OFFSET;
            const slot = scene.add.container(offset, offset);
            const { container: graphic } = buildCardBackGraphic(
                scene,
                cardOptions,
                kind === 'deck' ? CYBER.cyan : CYBER.graveBorder,
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
            ...uiTextStyle(13, kind === 'deck' ? '#7af0ff' : '#ffd4b8', { bold: true }),
        }).setOrigin(0.5, 0);

        this.container.add([ frame, brackets, stackMaskShape, this.stackContainer, this.countText, title ]);
        this.applyStack(0, null);
    }

    /** Makes the pile clickable to inspect its contents. */
    setClickHandler (handler: () => void): void
    {
        this.frame.setInteractive({ useHandCursor: true });

        this.frame.on('pointerover', () =>
        {
            this.frame.setStrokeStyle(3, this.frameBorder, 1);
        });
        this.frame.on('pointerout', () =>
        {
            this.frame.setStrokeStyle(2, this.frameBorder, 0.95);
        });
        this.frame.on('pointerdown', () =>
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
        const showTopFace = this.kind === 'graveyard' && previewCard !== null;

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
                    this.kind === 'deck' ? CYBER.cyan : CYBER.graveBorder,
                );

                slot.add(container);
            }
        }
    }
}
