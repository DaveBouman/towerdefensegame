import { GRID_CONFIG } from '../config/gridConfig';
import { buildCardGraphic } from '../cards/CardRenderer';
import { ARROW_GLYPH } from '../cards/cardArrows';
import { getJokerDirectionChoices } from '../cardGame/combat/AttackPipeline';
import { GAME_RULES } from '../cardGame/config/cardRegistry';
import type { BoardModel } from '../cardGame/domain/BoardModel';
import { isEnemyOwnedCard, isFieldOwnedCard } from '../cardGame/domain/cardOwnership';
import type { CardDirection } from '../cardGame/domain/cardDirections';
import type { CardInstance, SlotPosition } from '../cardGame/domain/types';
import type { BoardLayout } from './boardLayout';
import { JokerDirectionPicker } from './JokerDirectionPicker';

const SLOT_FILL = 0x1a1a2e;
const SLOT_BORDER = 0x4a4a72;
const SLOT_DROP = 0x3d5a80;
const SLOT_REPLACE = 0x6b4a2a;
const SLOT_MOVE = 0x2d5a3d;
const SLOT_SWAP = 0x5a3d6b;
const SLOT_INSET = 4;

export interface BoardCardDragHandlers {
    canDrag: () => boolean;
    onDragMove: (fromSlot: SlotPosition, worldX: number, worldY: number) => void;
    onDragEnd: (fromSlot: SlotPosition, worldX: number, worldY: number) => boolean;
}

export interface ChainStartHandlers {
    canSelect: () => boolean;
    onSelect: (slot: SlotPosition) => void;
}

interface ChainStartIndicator {
    slot: SlotPosition;
    ring: Phaser.GameObjects.Rectangle;
    arrow: Phaser.GameObjects.Text;
    label: Phaser.GameObjects.Text;
    hitArea: Phaser.GameObjects.Rectangle;
}

export type BoardHighlightMode = 'place' | 'replace' | 'move' | 'swap' | null;

const CHAIN_START_SELECTED = 0xf1c40f;
const CHAIN_START_IDLE = 0x5a5a78;

export class CardBoardView
{
    readonly container: Phaser.GameObjects.Container;
    private readonly slotBodies: Phaser.GameObjects.Rectangle[][] = [];
    private readonly cardContainers: (Phaser.GameObjects.Container | null)[][] = [];
    private highlightedSlot: SlotPosition | null = null;
    private highlightMode: BoardHighlightMode = null;
    private draggingFromSlot: SlotPosition | null = null;
    private draggingWrapper: Phaser.GameObjects.Container | null = null;
    private boardDragProxy?: Phaser.GameObjects.Container;
    private chainStartSlot: SlotPosition = {
        row: GAME_RULES.activationStart.row,
        col: GAME_RULES.activationStartColumn,
    };
    private readonly chainStartIndicators: ChainStartIndicator[] = [];
    private chainStartTween?: Phaser.Tweens.Tween;
    private readonly jokerDirectionPicker = new JokerDirectionPicker();

    constructor (
        private readonly scene: Phaser.Scene,
        private layout: BoardLayout,
        private readonly board: BoardModel,
        private readonly boardDragHandlers?: BoardCardDragHandlers,
        private readonly chainStartHandlers?: ChainStartHandlers,
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
                    this.cardContainers[row][col] = this.drawCard({ row, col }, x, y, tileSize, card);
                }
            }
        }

        this.drawChainStartIndicators();
        this.setChainStartSlot(this.chainStartSlot);
    }

    getChainStartSlot (): SlotPosition
    {
        return { ...this.chainStartSlot };
    }

    isDragging (): boolean
    {
        return this.draggingFromSlot !== null;
    }

    private normalizeWrapper (wrapper: Phaser.GameObjects.Container | null | undefined): void
    {
        wrapper?.setAlpha(1);
    }

    setChainStartSlot (slot: SlotPosition): void
    {
        this.chainStartSlot = { ...slot };
        this.updateChainStartSelection();
    }

    setChainStartActive (active: boolean): void
    {
        this.chainStartTween?.stop();
        this.chainStartTween = undefined;

        const indicator = this.getSelectedChainStartIndicator();

        if (!indicator)
        {
            return;
        }

        if (active)
        {
            indicator.arrow.setColor('#ffffff');
            indicator.ring.setStrokeStyle(3, 0xffffff, 1);
            this.chainStartTween = this.scene.tweens.add({
                targets: [ indicator.arrow, indicator.ring ],
                alpha: { from: 0.55, to: 1 },
                duration: 280,
                yoyo: true,
                repeat: -1,
            });
            return;
        }

        this.updateChainStartSelection();
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

    bringCardToFront (slot: SlotPosition): void
    {
        const wrapper = this.cardContainers[slot.row]?.[slot.col];

        if (wrapper)
        {
            this.container.bringToTop(wrapper);
        }
    }

    applyLayout (layout: BoardLayout): void
    {
        this.layout = layout;
        this.container.setPosition(layout.gridOffsetX, layout.gridOffsetY);
    }

    showJokerDirectionPicker (
        slot: SlotPosition,
        onChoose: (direction: CardDirection) => void,
    ): void
    {
        const directions = getJokerDirectionChoices(this.board, slot);

        if (directions.length === 0)
        {
            onChoose('right');
            return;
        }

        this.jokerDirectionPicker.show(
            this.scene,
            this.layout.gridOffsetX,
            this.layout.gridOffsetY,
            slot,
            directions,
            onChoose,
        );
    }

    hideJokerDirectionPicker (): void
    {
        this.jokerDirectionPicker.hide();
    }

    findSlotAt (worldX: number, worldY: number): SlotPosition | null
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

        return { row, col };
    }

    findDropSlot (worldX: number, worldY: number): SlotPosition | null
    {
        const slot = this.findSlotAt(worldX, worldY);

        if (!slot || !this.board.isEmpty(slot))
        {
            return null;
        }

        return slot;
    }

    highlightSlot (slot: SlotPosition | null, mode: BoardHighlightMode): void
    {
        if (
            slot?.row === this.highlightedSlot?.row
            && slot?.col === this.highlightedSlot?.col
            && mode === this.highlightMode
        )
        {
            return;
        }

        this.clearHighlight();
        this.highlightedSlot = slot;
        this.highlightMode = mode;

        if (!slot || !mode)
        {
            return;
        }

        const body = this.slotBodies[slot.row][slot.col];
        const styles: Record<Exclude<BoardHighlightMode, null>, { fill: number; stroke: number }> = {
            place: { fill: SLOT_DROP, stroke: 0x5dade2 },
            replace: { fill: SLOT_REPLACE, stroke: 0xf39c12 },
            move: { fill: SLOT_MOVE, stroke: 0x58d68d },
            swap: { fill: SLOT_SWAP, stroke: 0xbb8fce },
        };
        const style = styles[mode];

        body.setFillStyle(style.fill);
        body.setStrokeStyle(2, style.stroke, 1);
    }

    highlightHandPlacement (worldX: number, worldY: number): void
    {
        const slot = this.findSlotAt(worldX, worldY);

        if (!slot)
        {
            this.clearHighlight();
            return;
        }

        this.highlightSlot(slot, this.board.isEmpty(slot) ? 'place' : 'replace');
    }

    highlightBoardDrag (fromSlot: SlotPosition, worldX: number, worldY: number): void
    {
        const slot = this.findSlotAt(worldX, worldY);

        if (!slot || (slot.row === fromSlot.row && slot.col === fromSlot.col))
        {
            this.clearHighlight();
            return;
        }

        if (this.board.isEmpty(slot))
        {
            this.highlightSlot(slot, 'move');
            return;
        }

        this.highlightSlot(slot, 'swap');
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
        this.highlightMode = null;
    }

    removeCard (slot: SlotPosition): void
    {
        this.cardContainers[slot.row][slot.col]?.destroy();
        this.cardContainers[slot.row][slot.col] = null;
        this.slotBodies[slot.row][slot.col].setVisible(true);
        this.slotBodies[slot.row][slot.col].setFillStyle(SLOT_FILL);
        this.slotBodies[slot.row][slot.col].setStrokeStyle(2, SLOT_BORDER, 0.9);
        this.clearHighlight();
        this.bringChainStartToFront();
    }

    moveCard (from: SlotPosition, to: SlotPosition): void
    {
        const { tileSize } = GRID_CONFIG;
        const wrapper = this.cardContainers[from.row][from.col];

        if (!wrapper)
        {
            return;
        }

        this.cardContainers[to.row][to.col]?.destroy();

        const x = to.col * tileSize + tileSize / 2;
        const y = to.row * tileSize + tileSize / 2;
        const size = tileSize - SLOT_INSET * 2;

        wrapper.setPosition(x - size / 2, y - size / 2);
        wrapper.setData('slotRow', to.row);
        wrapper.setData('slotCol', to.col);
        this.normalizeWrapper(wrapper);
        this.cardContainers[to.row][to.col] = wrapper;
        this.cardContainers[from.row][from.col] = null;
        this.slotBodies[from.row][from.col].setVisible(true);
        this.slotBodies[from.row][from.col].setFillStyle(SLOT_FILL);
        this.slotBodies[from.row][from.col].setStrokeStyle(2, SLOT_BORDER, 0.9);
        this.slotBodies[to.row][to.col].setVisible(false);
        this.clearHighlight();
        this.bringChainStartToFront();
    }

    swapCards (a: SlotPosition, b: SlotPosition): void
    {
        const { tileSize } = GRID_CONFIG;
        const wrapperA = this.cardContainers[a.row][a.col];
        const wrapperB = this.cardContainers[b.row][b.col];
        const size = tileSize - SLOT_INSET * 2;

        const positionFor = (slot: SlotPosition): { x: number; y: number } =>
        {
            const x = slot.col * tileSize + tileSize / 2;
            const y = slot.row * tileSize + tileSize / 2;

            return { x: x - size / 2, y: y - size / 2 };
        };

        if (wrapperA)
        {
            const pos = positionFor(b);
            wrapperA.setPosition(pos.x, pos.y);
            wrapperA.setData('slotRow', b.row);
            wrapperA.setData('slotCol', b.col);
            this.normalizeWrapper(wrapperA);
        }

        if (wrapperB)
        {
            const pos = positionFor(a);
            wrapperB.setPosition(pos.x, pos.y);
            wrapperB.setData('slotRow', a.row);
            wrapperB.setData('slotCol', a.col);
            this.normalizeWrapper(wrapperB);
        }

        this.cardContainers[a.row][a.col] = wrapperB;
        this.cardContainers[b.row][b.col] = wrapperA;
        this.slotBodies[a.row][a.col].setVisible(wrapperB === null);
        this.slotBodies[b.row][b.col].setVisible(wrapperA === null);

        if (wrapperB === null)
        {
            this.slotBodies[a.row][a.col].setFillStyle(SLOT_FILL);
            this.slotBodies[a.row][a.col].setStrokeStyle(2, SLOT_BORDER, 0.9);
        }

        if (wrapperA === null)
        {
            this.slotBodies[b.row][b.col].setFillStyle(SLOT_FILL);
            this.slotBodies[b.row][b.col].setStrokeStyle(2, SLOT_BORDER, 0.9);
        }

        this.clearHighlight();
        this.bringChainStartToFront();
    }

    placeCard (slot: SlotPosition, card: CardInstance): void
    {
        this.setSlotCard(slot, card);
    }

    /** Rebuilds all card visuals from the board model — prevents ghost cards after moves/swaps/replaces. */
    syncFromBoard (board: BoardModel): void
    {
        this.hideJokerDirectionPicker();
        this.clearHighlight();

        const { rows, cols, tileSize } = GRID_CONFIG;

        for (let row = 0; row < rows; row++)
        {
            for (let col = 0; col < cols; col++)
            {
                this.cardContainers[row][col]?.destroy();
                this.cardContainers[row][col] = null;

                const slotBody = this.slotBodies[row][col];

                slotBody.setVisible(true);
                slotBody.setFillStyle(SLOT_FILL);
                slotBody.setStrokeStyle(2, SLOT_BORDER, 0.9);
            }
        }

        for (let row = 0; row < rows; row++)
        {
            for (let col = 0; col < cols; col++)
            {
                const card = board.getCardAt({ row, col });

                if (card)
                {
                    this.setSlotCard({ row, col }, card, tileSize);
                }
            }
        }

        this.bringChainStartToFront();
    }

    /** Flies proxy cards to the graveyard, then resets empty slots. */
    animateCardsToGraveyard (targetX: number, targetY: number, onComplete: () => void): void
    {
        this.hideJokerDirectionPicker();
        this.clearHighlight();
        this.setChainStartActive(false);

        const { tileSize } = GRID_CONFIG;
        const cardSize = tileSize - SLOT_INSET * 2;
        const proxies: Phaser.GameObjects.Container[] = [];

        for (let row = 0; row < GRID_CONFIG.rows; row++)
        {
            for (let col = 0; col < GRID_CONFIG.cols; col++)
            {
                const wrapper = this.cardContainers[row][col];
                const card = this.board.getCardAt({ row, col });

                if (!wrapper || !card)
                {
                    continue;
                }

                const matrix = wrapper.getWorldTransformMatrix();
                const { container: graphic } = buildCardGraphic(this.scene, card, {
                    width: cardSize,
                    height: cardSize,
                });
                const proxy = this.scene.add.container(matrix.tx, matrix.ty);

                proxy.setDepth(1500);
                proxy.add(graphic);
                proxies.push(proxy);
            }
        }

        this.clearBoard();

        if (proxies.length === 0)
        {
            onComplete();
            return;
        }

        let completed = false;

        const finish = (): void =>
        {
            if (completed)
            {
                return;
            }

            completed = true;

            for (const proxy of proxies)
            {
                this.scene.tweens.killTweensOf(proxy);
                proxy.destroy();
            }

            onComplete();
        };

        for (const proxy of proxies)
        {
            this.scene.tweens.add({
                targets: proxy,
                x: targetX,
                y: targetY,
                scaleX: 0.35,
                scaleY: 0.35,
                alpha: 0.15,
                duration: 420,
                ease: 'Quad.easeIn',
                onComplete: finish,
            });
        }

        this.scene.time.delayedCall(480, finish);
    }

    clearBoard (): void
    {
        this.hideJokerDirectionPicker();

        const { rows, cols } = GRID_CONFIG;

        for (let row = 0; row < rows; row++)
        {
            for (let col = 0; col < cols; col++)
            {
                const wrapper = this.cardContainers[row][col];

                if (wrapper)
                {
                    this.scene.tweens.killTweensOf(wrapper);
                    wrapper.setScale(1);
                    wrapper.setAlpha(1);
                    wrapper.destroy();
                }

                this.cardContainers[row][col] = null;

                const slotBody = this.slotBodies[row][col];

                slotBody.setVisible(true);
                slotBody.setFillStyle(SLOT_FILL);
                slotBody.setStrokeStyle(2, SLOT_BORDER, 0.9);
            }
        }

        this.clearHighlight();
        this.setChainStartActive(false);
        this.bringChainStartToFront();
    }

    destroy (): void
    {
        this.cancelBoardDrag();
        this.hideJokerDirectionPicker();
        this.chainStartTween?.stop();
        this.container.destroy();
    }

    private drawChainStartIndicators (): void
    {
        const { tileSize, rows } = GRID_CONFIG;
        const startCol = GAME_RULES.activationStartColumn;

        for (let row = 0; row < rows; row++)
        {
            const slot = { row, col: startCol };
            const centerX = slot.col * tileSize + tileSize / 2;
            const centerY = slot.row * tileSize + tileSize / 2;
            const slotSize = tileSize - SLOT_INSET * 2;
            const cellLeftX = slot.col * tileSize;

            const ring = this.scene.add.rectangle(
                centerX,
                centerY,
                slotSize + 8,
                slotSize + 8,
                0x000000,
                0,
            );

            const arrow = this.scene.add.text(cellLeftX - 10, centerY, ARROW_GLYPH.right, {
                fontFamily: 'monospace',
                fontSize: '30px',
                color: '#5a5a78',
                fontStyle: 'bold',
            }).setOrigin(1, 0.5);

            const label = this.scene.add.text(cellLeftX - 10, centerY - 24, 'START', {
                fontFamily: 'monospace',
                fontSize: '11px',
                color: '#8a8aa8',
                fontStyle: 'bold',
            }).setOrigin(1, 0.5);

            const hitArea = this.scene.add.rectangle(cellLeftX - 28, centerY, 36, slotSize + 12, 0x000000, 0);

            hitArea.setInteractive({ useHandCursor: true });
            hitArea.on('pointerdown', () =>
            {
                if (!this.chainStartHandlers?.canSelect())
                {
                    return;
                }

                this.chainStartHandlers.onSelect(slot);
            });

            this.container.add([ ring, arrow, label, hitArea ]);
            this.chainStartIndicators.push({ slot, ring, arrow, label, hitArea });
        }

        this.bringChainStartToFront();
    }

    private getSelectedChainStartIndicator (): ChainStartIndicator | undefined
    {
        return this.chainStartIndicators.find((indicator) =>
            indicator.slot.row === this.chainStartSlot.row
            && indicator.slot.col === this.chainStartSlot.col);
    }

    private updateChainStartSelection (): void
    {
        for (const indicator of this.chainStartIndicators)
        {
            const selected = indicator.slot.row === this.chainStartSlot.row
                && indicator.slot.col === this.chainStartSlot.col;

            indicator.arrow.setAlpha(1);
            indicator.ring.setAlpha(selected ? 1 : 0.45);
            indicator.label.setVisible(selected);
            indicator.arrow.setColor(selected ? '#f1c40f' : '#5a5a78');
            indicator.ring.setStrokeStyle(2, selected ? CHAIN_START_SELECTED : CHAIN_START_IDLE, selected ? 0.9 : 0.5);
        }

        this.bringChainStartToFront();
    }

    private bringChainStartToFront (): void
    {
        for (const indicator of this.chainStartIndicators)
        {
            this.container.bringToTop(indicator.ring);
            this.container.bringToTop(indicator.arrow);
            this.container.bringToTop(indicator.label);
            this.container.bringToTop(indicator.hitArea);
        }
    }

    private setSlotCard (slot: SlotPosition, card: CardInstance | null, tileSize = GRID_CONFIG.tileSize): void
    {
        const slotBody = this.slotBodies[slot.row][slot.col];

        this.cardContainers[slot.row][slot.col]?.destroy();
        this.cardContainers[slot.row][slot.col] = null;

        if (!card)
        {
            slotBody.setVisible(true);
            slotBody.setFillStyle(SLOT_FILL);
            slotBody.setStrokeStyle(2, SLOT_BORDER, 0.9);
            return;
        }

        const x = slot.col * tileSize + tileSize / 2;
        const y = slot.row * tileSize + tileSize / 2;

        slotBody.setVisible(false);

        const wrapper = this.drawCard(slot, x, y, tileSize, card);

        this.normalizeWrapper(wrapper);
        this.cardContainers[slot.row][slot.col] = wrapper;
    }

    private drawCard (
        slot: SlotPosition,
        x: number,
        y: number,
        tileSize: number,
        card: CardInstance,
    ): Phaser.GameObjects.Container
    {
        const size = tileSize - SLOT_INSET * 2;
        const { container: graphic, hitArea } = buildCardGraphic(
            this.scene,
            card,
            {
                width: size,
                height: size,
                interactive: Boolean(this.boardDragHandlers),
            },
        );
        const wrapper = this.scene.add.container(x - size / 2, y - size / 2);

        wrapper.setDepth(1);
        wrapper.add(graphic);
        wrapper.setData('slotRow', slot.row);
        wrapper.setData('slotCol', slot.col);
        this.container.add(wrapper);
        this.container.bringToTop(wrapper);

        if (this.boardDragHandlers)
        {
            hitArea.on('pointerdown', (pointer: Phaser.Input.Pointer) =>
            {
                const row = wrapper.getData('slotRow') as number;
                const col = wrapper.getData('slotCol') as number;
                const currentSlot = { row, col };
                const currentCard = this.board.getCardAt(currentSlot);

                if (!currentCard || isEnemyOwnedCard(currentCard) || isFieldOwnedCard(currentCard))
                {
                    return;
                }

                this.beginBoardDrag(currentSlot, currentCard, pointer, size);
            });
        }

        return wrapper;
    }

    private findSlotForPosition (centerX: number, centerY: number, tileSize: number): SlotPosition | null
    {
        const col = Math.floor((centerX - tileSize / 2) / tileSize + 0.5);
        const row = Math.floor((centerY - tileSize / 2) / tileSize + 0.5);

        if (row < 0 || row >= GRID_CONFIG.rows || col < 0 || col >= GRID_CONFIG.cols)
        {
            return null;
        }

        return { row, col };
    }

    private beginBoardDrag (
        slot: SlotPosition,
        card: CardInstance,
        pointer: Phaser.Input.Pointer,
        size: number,
    ): void
    {
        if (!this.boardDragHandlers?.canDrag() || this.draggingFromSlot)
        {
            return;
        }

        this.draggingFromSlot = slot;
        const wrapper = this.cardContainers[slot.row][slot.col];
        this.draggingWrapper = wrapper ?? null;

        pointer.updateWorldPoint(this.scene.cameras.main);
        const worldMatrix = wrapper?.getWorldTransformMatrix();
        const worldX = worldMatrix?.tx ?? pointer.worldX;
        const worldY = worldMatrix?.ty ?? pointer.worldY;
        const dragOffsetX = pointer.worldX - worldX;
        const dragOffsetY = pointer.worldY - worldY;

        wrapper?.setAlpha(0.25);

        const { container } = buildCardGraphic(this.scene, card, {
            width: size,
            height: size,
        });

        this.boardDragProxy = this.scene.add.container(
            pointer.worldX - dragOffsetX,
            pointer.worldY - dragOffsetY,
        );
        this.boardDragProxy.setDepth(1000);
        this.boardDragProxy.add(container);
        this.boardDragProxy.setData('offsetX', dragOffsetX);
        this.boardDragProxy.setData('offsetY', dragOffsetY);

        const onPointerMove = (movePointer: Phaser.Input.Pointer): void =>
        {
            if (!this.draggingFromSlot || !this.boardDragProxy)
            {
                return;
            }

            movePointer.updateWorldPoint(this.scene.cameras.main);
            const offsetX = this.boardDragProxy.getData('offsetX') as number;
            const offsetY = this.boardDragProxy.getData('offsetY') as number;

            this.boardDragProxy.setPosition(
                movePointer.worldX - offsetX,
                movePointer.worldY - offsetY,
            );
            this.boardDragHandlers?.onDragMove(this.draggingFromSlot, movePointer.worldX, movePointer.worldY);
        };

        const onPointerUp = (upPointer: Phaser.Input.Pointer): void =>
        {
            if (!this.draggingFromSlot)
            {
                return;
            }

            const fromSlot = this.draggingFromSlot;

            upPointer.updateWorldPoint(this.scene.cameras.main);
            const handled = this.boardDragHandlers?.onDragEnd(
                fromSlot,
                upPointer.worldX,
                upPointer.worldY,
            ) ?? false;

            if (handled)
            {
                this.finishBoardDrag();
            }
            else
            {
                this.cancelBoardDrag();
                this.normalizeWrapper(this.cardContainers[fromSlot.row]?.[fromSlot.col]);
            }
        };

        this.scene.input.on('pointermove', onPointerMove);
        this.scene.input.on('pointerup', onPointerUp);
        this.scene.input.on('pointerupoutside', onPointerUp);
        this.boardDragProxy.setData('cleanup', () =>
        {
            this.scene.input.off('pointermove', onPointerMove);
            this.scene.input.off('pointerup', onPointerUp);
            this.scene.input.off('pointerupoutside', onPointerUp);
        });
    }

    private finishBoardDrag (): void
    {
        const cleanup = this.boardDragProxy?.getData('cleanup') as (() => void) | undefined;

        cleanup?.();
        this.boardDragProxy?.destroy();
        this.boardDragProxy = undefined;
        this.draggingWrapper = null;
        this.draggingFromSlot = null;
        this.clearHighlight();
    }

    private cancelBoardDrag (): void
    {
        const cleanup = this.boardDragProxy?.getData('cleanup') as (() => void) | undefined;

        cleanup?.();
        this.boardDragProxy?.destroy();
        this.boardDragProxy = undefined;
        this.normalizeWrapper(this.draggingWrapper);
        this.draggingWrapper = null;
        this.draggingFromSlot = null;
        this.clearHighlight();
    }
}
