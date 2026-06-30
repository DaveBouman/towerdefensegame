import { uiTextStyle } from '../config/uiTypography';
import type { BoardLayout } from './boardLayout';

const DECK_FILL = 0x243b55;
const DECK_BORDER = 0x5dade2;
const GRAVEYARD_FILL = 0x3d2b1f;
const GRAVEYARD_BORDER = 0xc97b4a;
const CARD_BACK = 0x1a1a2e;
const CARD_BACK_BORDER = 0x6a6a8a;
const STACK_WIDTH = 52;
const STACK_HEIGHT = 72;
const MAX_VISIBLE_STACK = 4;

export class CardPileView
{
    readonly container: Phaser.GameObjects.Container;
    private readonly countText: Phaser.GameObjects.Text;
    private readonly stackContainer: Phaser.GameObjects.Container;
    private readonly stackCards: Phaser.GameObjects.Rectangle[] = [];
    private readonly emptyStack: Phaser.GameObjects.Rectangle;
    private count = 0;

    constructor (
        private readonly scene: Phaser.Scene,
        layout: BoardLayout,
        x: number,
        y: number,
        label: string,
        kind: 'deck' | 'graveyard',
    )
    {
        const { pileWidth, pileHeight } = layout;
        const fill = kind === 'deck' ? DECK_FILL : GRAVEYARD_FILL;
        const border = kind === 'deck' ? DECK_BORDER : GRAVEYARD_BORDER;

        this.container = scene.add.container(x, y);

        const frame = scene.add.rectangle(0, 0, pileWidth + 12, pileHeight + 34, fill, 0.92);

        frame.setOrigin(0, 0);
        frame.setStrokeStyle(2, border, 0.95);

        this.stackContainer = scene.add.container(pileWidth / 2 + 6, 8);

        this.emptyStack = scene.add.rectangle(0, 0, STACK_WIDTH, STACK_HEIGHT, CARD_BACK, 0.2);
        this.emptyStack.setStrokeStyle(2, CARD_BACK_BORDER, 0.35);
        this.emptyStack.setOrigin(0.5, 0);
        this.stackContainer.add(this.emptyStack);

        for (let i = 0; i < MAX_VISIBLE_STACK; i++)
        {
            const offset = i * 3;
            const card = scene.add.rectangle(offset, offset, STACK_WIDTH, STACK_HEIGHT, CARD_BACK, 1);

            card.setStrokeStyle(2, CARD_BACK_BORDER, 0.95);
            card.setOrigin(0.5, 0);
            card.setVisible(false);
            this.stackCards.push(card);
            this.stackContainer.add(card);
        }

        this.countText = scene.add.text(pileWidth / 2 + 6, pileHeight + 16, '0', {
            ...uiTextStyle(20, '#ffffff', { bold: true }),
        }).setOrigin(0.5, 0);

        const title = scene.add.text(pileWidth / 2 + 6, pileHeight + 36, label, {
            ...uiTextStyle(13, kind === 'deck' ? '#c8e6ff' : '#ffd9b8', { bold: true }),
        }).setOrigin(0.5, 0);

        this.container.add([ frame, this.stackContainer, this.countText, title ]);
        this.applyCount(0);
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

        this.applyCount(count);
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

    private applyCount (count: number): void
    {
        this.count = Math.max(0, count);
        this.countText.setText(String(this.count));

        if (this.count === 0)
        {
            this.emptyStack.setVisible(true);

            for (const card of this.stackCards)
            {
                card.setVisible(false);
            }

            return;
        }

        this.emptyStack.setVisible(false);

        const visibleCards = Math.min(this.count, MAX_VISIBLE_STACK);

        for (let i = 0; i < this.stackCards.length; i++)
        {
            this.stackCards[i].setVisible(i < visibleCards);
        }
    }
}
