import type { CardInstance } from '../cardGame/domain/types';
import { getCardDefinitionOrThrow, isCardUnplayable } from '../cardGame/config/cardRegistry';
import { buildCardGraphic } from '../cards/CardRenderer';
import { attachCardTooltip } from '../cardGame/presentation/tooltips/CardTooltipController';
import { CYBER } from '../config/cyberpunkTheme';
import { HAND_CARD_GAP, HAND_CARD_HEIGHT, HAND_CARD_WIDTH } from '../cards/cardVisuals';
import type { BoardLayout } from './boardLayout';

export interface CardHandDragHandlers {
    onDragMove: (worldX: number, worldY: number) => void;
    /** Returns true when the card was placed on the board. */
    onDragEnd: (handIndex: number, worldX: number, worldY: number) => boolean;
    /** Called after a successful board placement so the hand can refresh immediately. */
    onPlaced?: () => void;
}

const HAND_FAN_SPREAD = 0.055;
const HAND_FAN_DROP = 7;

export class CardHandView
{
    readonly container: Phaser.GameObjects.Container;
    private readonly slotContainers: Phaser.GameObjects.Container[] = [];
    private readonly hoverOutlines: Phaser.GameObjects.Rectangle[] = [];
    private readonly selectedIndices = new Set<number>();
    private dragProxy?: Phaser.GameObjects.Container;
    private draggingIndex: number | null = null;
    private dragOffsetX = 0;
    private dragOffsetY = 0;
    private rerollMode = false;

    constructor (
        private readonly scene: Phaser.Scene,
        layout: BoardLayout,
        private hand: CardInstance[],
        private readonly handlers: CardHandDragHandlers,
        private readonly canBeginDrag: () => boolean = () => true,
        private readonly onRerollSelectionChange?: (selectedCount: number) => void,
    )
    {
        this.container = scene.add.container(layout.handCenterX, layout.handY);
        this.renderHand();
    }

    syncHand (hand: readonly CardInstance[]): void
    {
        this.cancelDrag();
        this.selectedIndices.clear();
        this.hand = [ ...hand ];
        this.renderHand();
        this.onRerollSelectionChange?.(0);
    }

    containsPoint (worldX: number, worldY: number): boolean
    {
        const bounds = this.container.getBounds();

        return bounds.contains(worldX, worldY);
    }

    isDragging (): boolean
    {
        return this.draggingIndex !== null;
    }

    isRerollMode (): boolean
    {
        return this.rerollMode;
    }

    setRerollMode (active: boolean): void
    {
        this.cancelDrag();
        this.rerollMode = active;

        if (!active)
        {
            this.selectedIndices.clear();
        }

        this.updateSelectionVisuals();
        this.onRerollSelectionChange?.(this.selectedIndices.size);
    }

    getRerollSelectionCount (): number
    {
        return this.selectedIndices.size;
    }

    getSelectedHandIndices (): number[]
    {
        return [ ...this.selectedIndices ].sort((a, b) => a - b);
    }

    destroy (): void
    {
        this.cancelDrag();
        this.container.destroy();
    }

    private renderHand (): void
    {
        for (const slot of this.slotContainers)
        {
            slot.destroy();
        }

        this.slotContainers.length = 0;
        this.hoverOutlines.length = 0;
        this.container.removeAll(true);

        const center = (this.hand.length - 1) / 2;

        this.hand.forEach((card, index) =>
        {
            const offset = index - center;
            const x = index * (HAND_CARD_WIDTH + HAND_CARD_GAP);
            const y = Math.abs(offset) * HAND_FAN_DROP;
            const slot = this.scene.add.container(x, y);
            const hoverOutline = this.scene.add.rectangle(
                HAND_CARD_WIDTH / 2,
                HAND_CARD_HEIGHT / 2,
                HAND_CARD_WIDTH + 10,
                HAND_CARD_HEIGHT + 10,
                CYBER.cyan,
                0,
            );
            hoverOutline.setStrokeStyle(2, CYBER.cyan, 0);
            hoverOutline.setVisible(false);

            const { container: graphic, hitArea } = buildCardGraphic(
                this.scene,
                card,
                {
                    width: HAND_CARD_WIDTH,
                    height: HAND_CARD_HEIGHT,
                    interactive: true,
                },
            );

            const unplayable = isCardUnplayable(getCardDefinitionOrThrow(card.definitionId));

            hitArea.on('pointerdown', (pointer: Phaser.Input.Pointer) =>
            {
                if (this.rerollMode)
                {
                    this.toggleRerollSelection(index);
                    return;
                }

                this.beginDrag(index, card, pointer);
            });

            if (!unplayable)
            {
                hitArea.on('pointerover', () =>
                {
                    if (this.draggingIndex !== null)
                    {
                        return;
                    }

                    hoverOutline.setVisible(true);
                    hoverOutline.setStrokeStyle(2, CYBER.cyan, 0.9);
                    slot.setY(y - 8);
                });
                hitArea.on('pointerout', () =>
                {
                    if (this.draggingIndex === index)
                    {
                        return;
                    }

                    hoverOutline.setVisible(false);
                    this.updateSelectionVisuals();
                });
            }

            attachCardTooltip(this.scene, hitArea, card);

            slot.add([ hoverOutline, graphic ]);
            slot.setRotation(offset * HAND_FAN_SPREAD);
            this.container.add(slot);
            this.slotContainers.push(slot);
            this.hoverOutlines.push(hoverOutline);

            if (unplayable)
            {
                slot.setAlpha(0.78);
            }
        });

        this.updateSelectionVisuals();
    }

    private toggleRerollSelection (index: number): void
    {
        if (this.selectedIndices.has(index))
        {
            this.selectedIndices.delete(index);
        }
        else
        {
            this.selectedIndices.add(index);
        }

        this.updateSelectionVisuals();
        this.onRerollSelectionChange?.(this.selectedIndices.size);
    }

    private updateSelectionVisuals (): void
    {
        const center = (this.hand.length - 1) / 2;

        this.slotContainers.forEach((slot, index) =>
        {
            const selected = this.rerollMode && this.selectedIndices.has(index);
            const offset = index - center;
            const baseY = Math.abs(offset) * HAND_FAN_DROP;

            slot.setY(selected ? baseY - 14 : baseY);
            slot.setScale(selected ? 1.08 : 1);

            const outline = this.hoverOutlines[index];

            if (outline)
            {
                outline.setStrokeStyle(2, selected ? CYBER.magenta : CYBER.cyan, selected ? 1 : 0);
                outline.setVisible(selected);
            }
        });
    }

    private beginDrag (index: number, card: CardInstance, pointer: Phaser.Input.Pointer): void
    {
        if (this.draggingIndex !== null || !this.canBeginDrag())
        {
            return;
        }

        if (isCardUnplayable(getCardDefinitionOrThrow(card.definitionId)))
        {
            return;
        }

        this.draggingIndex = index;
        const slot = this.slotContainers[index];
        const worldMatrix = slot.getWorldTransformMatrix();
        const worldX = worldMatrix.tx;
        const worldY = worldMatrix.ty;

        pointer.updateWorldPoint(this.scene.cameras.main);
        this.dragOffsetX = pointer.worldX - worldX;
        this.dragOffsetY = pointer.worldY - worldY;
        slot.setAlpha(0.25);
        this.hoverOutlines[index]?.setVisible(false);

        const { container } = buildCardGraphic(this.scene, card, {
            width: HAND_CARD_WIDTH,
            height: HAND_CARD_HEIGHT,
        });

        this.dragProxy = this.scene.add.container(
            pointer.worldX - this.dragOffsetX,
            pointer.worldY - this.dragOffsetY,
        );
        this.dragProxy.setDepth(1000);
        this.dragProxy.add(container);

        this.scene.input.on('pointermove', this.onPointerMove);
        this.scene.input.on('pointerup', this.onPointerUp);
        this.scene.input.on('pointerupoutside', this.onPointerUp);
    }

    private readonly onPointerMove = (pointer: Phaser.Input.Pointer): void =>
    {
        if (this.draggingIndex === null || !this.dragProxy)
        {
            return;
        }

        pointer.updateWorldPoint(this.scene.cameras.main);
        this.dragProxy.setPosition(
            pointer.worldX - this.dragOffsetX,
            pointer.worldY - this.dragOffsetY,
        );
        this.handlers.onDragMove(pointer.worldX, pointer.worldY);
    };

    private readonly onPointerUp = (pointer: Phaser.Input.Pointer): void =>
    {
        if (this.draggingIndex === null)
        {
            return;
        }

        const index = this.draggingIndex;

        pointer.updateWorldPoint(this.scene.cameras.main);
        const worldX = pointer.worldX;
        const worldY = pointer.worldY;

        this.cancelDrag();

        const placed = this.handlers.onDragEnd(index, worldX, worldY);

        if (placed)
        {
            this.handlers.onPlaced?.();
        }
    };

    private cancelDrag (): void
    {
        const index = this.draggingIndex;

        this.scene.input.off('pointermove', this.onPointerMove);
        this.scene.input.off('pointerup', this.onPointerUp);
        this.scene.input.off('pointerupoutside', this.onPointerUp);
        this.dragProxy?.destroy();
        this.dragProxy = undefined;
        this.draggingIndex = null;

        if (index !== null)
        {
            this.slotContainers[index]?.setAlpha(1);
            this.updateSelectionVisuals();
        }
    }
}
