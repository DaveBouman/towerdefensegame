import { GRID_CONFIG } from '../config/gridConfig';
import { buildCardGraphicFromDefinition } from '../cards/CardRenderer';
import type { BoardModel } from '../cardGame/domain/BoardModel';
import type { CardInstance, SlotPosition } from '../cardGame/domain/types';
import type { BoardLayout } from './boardLayout';

const SLOT_FILL = 0x1a1a2e;
const SLOT_BORDER = 0x4a4a72;
const SLOT_DROP = 0x3d5a80;
const SLOT_INSET = 4;

export class CardBoardView
{
    readonly container: Phaser.GameObjects.Container;
    private readonly slotBodies: Phaser.GameObjects.Rectangle[][] = [];
    private readonly cardContainers: (Phaser.GameObjects.Container | null)[][] = [];
    private highlightedSlot: SlotPosition | null = null;

    constructor (
        private readonly scene: Phaser.Scene,
        private readonly layout: BoardLayout,
        private readonly board: BoardModel,
    )
    {
        const { cols, rows, tileSize } = GRID_CONFIG;
        this.container = scene.add.container(layout.gridOffsetX, layout.gridOffsetY);

        for (let row = 0; row < rows; row++)
        {
            this.slotBodies[row] = [];
            this.cardContainers[row] = [];

            for (let col = 0; col < cols; col++)
            {
                const x = col * tileSize + tileSize / 2;
                const y = row * tileSize + tileSize / 2;
                const slotSize = tileSize - SLOT_INSET * 2;
                const slot = scene.add.rectangle(x, y, slotSize, slotSize, SLOT_FILL);

                slot.setStrokeStyle(2, SLOT_BORDER, 0.9);
                slot.setDepth(0);
                this.container.add(slot);
                this.slotBodies[row][col] = slot;
                this.cardContainers[row][col] = null;

                const card = board.getCardAt({ row, col });

                if (card)
                {
                    slot.setVisible(false);
                    this.cardContainers[row][col] = this.drawCard(x, y, tileSize, card);
                }
            }
        }
    }

    getCardVisualTarget (slot: SlotPosition): import('../cardGame/presentation/visualEffects/types').CardVisualTarget | null
    {
        const wrapper = this.cardContainers[slot.row]?.[slot.col];

        if (!wrapper)
        {
            return null;
        }

        const { tileSize } = GRID_CONFIG;
        const slotSize = tileSize - SLOT_INSET * 2;

        return { slot, wrapper, width: slotSize, height: slotSize };
    }

    findDropSlot (worldX: number, worldY: number): SlotPosition | null
    {
        const { tileSize, cols, rows } = GRID_CONFIG;
        const localX = worldX - this.layout.gridOffsetX;
        const localY = worldY - this.layout.gridOffsetY;
        const col = Math.floor(localX / tileSize);
        const row = Math.floor(localY / tileSize);

        if (col < 0 || col >= cols || row < 0 || row >= rows)
        {
            return null;
        }

        if (!this.board.isEmpty({ row, col }))
        {
            return null;
        }

        return { row, col };
    }

    highlightDropSlot (worldX: number, worldY: number): void
    {
        const slot = this.findDropSlot(worldX, worldY);

        if (
            slot?.row === this.highlightedSlot?.row
            && slot?.col === this.highlightedSlot?.col
        )
        {
            return;
        }

        this.clearHighlight();
        this.highlightedSlot = slot;

        if (!slot)
        {
            return;
        }

        const body = this.slotBodies[slot.row][slot.col];

        body.setFillStyle(SLOT_DROP);
        body.setStrokeStyle(2, 0x5dade2, 1);
    }

    clearHighlight (): void
    {
        if (!this.highlightedSlot)
        {
            return;
        }

        const { row, col } = this.highlightedSlot;
        const body = this.slotBodies[row][col];

        body.setFillStyle(SLOT_FILL);
        body.setStrokeStyle(2, SLOT_BORDER, 0.9);
        this.highlightedSlot = null;
    }

    placeCard (slot: SlotPosition, card: CardInstance): void
    {
        const { tileSize } = GRID_CONFIG;
        const x = slot.col * tileSize + tileSize / 2;
        const y = slot.row * tileSize + tileSize / 2;
        const slotBody = this.slotBodies[slot.row][slot.col];

        slotBody.setVisible(false);

        this.cardContainers[slot.row][slot.col]?.destroy();
        this.cardContainers[slot.row][slot.col] = this.drawCard(x, y, tileSize, card);
        this.clearHighlight();
    }

    destroy (): void
    {
        this.container.destroy();
    }

    private drawCard (
        x: number,
        y: number,
        tileSize: number,
        card: CardInstance,
    ): Phaser.GameObjects.Container
    {
        const size = tileSize - SLOT_INSET * 2;
        const { container: graphic } = buildCardGraphicFromDefinition(
            this.scene,
            card.definitionId,
            { width: size, height: size },
        );
        const wrapper = this.scene.add.container(x - size / 2, y - size / 2);

        wrapper.setDepth(1);
        wrapper.add(graphic);
        this.container.add(wrapper);
        this.container.bringToTop(wrapper);

        return wrapper;
    }
}
