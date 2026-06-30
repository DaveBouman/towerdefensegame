import { uiTextStyle } from '../config/uiTypography';
import { GRID_CONFIG } from '../config/gridConfig';
import { ARROW_GLYPH, arrowLabelPosition } from '../cards/cardArrows';
import type { CardDirection } from '../cardGame/domain/cardDirections';
import type { SlotPosition } from '../cardGame/domain/types';

const PICKER_DEPTH = 3000;
const BUTTON_BG = 0x2c2c44;
const BUTTON_BORDER = 0xf1c40f;

export class JokerDirectionPicker
{
    private overlay?: Phaser.GameObjects.Container;

    show (
        scene: Phaser.Scene,
        gridOffsetX: number,
        gridOffsetY: number,
        slot: SlotPosition,
        directions: readonly CardDirection[],
        onChoose: (direction: CardDirection) => void,
    ): void
    {
        this.hide();

        if (directions.length === 0)
        {
            onChoose('right');
            return;
        }

        const { tileSize } = GRID_CONFIG;
        const cardSize = tileSize - 8;
        const centerX = gridOffsetX + slot.col * tileSize + tileSize / 2;
        const centerY = gridOffsetY + slot.row * tileSize + tileSize / 2;

        this.overlay = scene.add.container(0, 0);
        this.overlay.setDepth(PICKER_DEPTH);

        const backdrop = scene.add.rectangle(
            centerX,
            centerY,
            cardSize + 28,
            cardSize + 28,
            0x000000,
            0.35,
        );

        backdrop.setStrokeStyle(2, BUTTON_BORDER, 0.8);
        this.overlay.add(backdrop);

        const prompt = scene.add.text(centerX, centerY - cardSize * 0.62, 'Choose direction', {
            ...uiTextStyle(14, '#fff3c4', { bold: true }),
        }).setOrigin(0.5);

        this.overlay.add(prompt);

        for (const direction of directions)
        {
            const local = arrowLabelPosition(direction, cardSize, cardSize);
            const x = centerX + local.x - cardSize / 2;
            const y = centerY + local.y - cardSize / 2;

            const button = scene.add.rectangle(x, y, 30, 30, BUTTON_BG, 0.95);

            button.setStrokeStyle(2, BUTTON_BORDER, 1);
            button.setInteractive({ useHandCursor: true });

            const label = scene.add.text(x, y, ARROW_GLYPH[direction], {
                ...uiTextStyle(20, '#ffffff', { bold: true }),
            }).setOrigin(0.5);

            button.on('pointerover', () => button.setFillStyle(0x4a4a72, 1));
            button.on('pointerout', () => button.setFillStyle(BUTTON_BG, 0.95));
            button.on('pointerdown', () =>
            {
                this.hide();
                onChoose(direction);
            });

            this.overlay.add([ button, label ]);
        }
    }

    hide (): void
    {
        this.overlay?.destroy();
        this.overlay = undefined;
    }
}
