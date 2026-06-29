import { GRID_CONFIG, getGridPixelSize } from '../config/gridConfig';
import { HAND_CARD_GAP, HAND_CARD_HEIGHT, HAND_CARD_WIDTH } from '../cards/cardVisuals';

export interface BoardLayout {
    canvasWidth: number;
    canvasHeight: number;
    gridOffsetX: number;
    gridOffsetY: number;
    gridWidth: number;
    gridHeight: number;
    tileSize: number;
    enemyX: number;
    enemyY: number;
    enemySize: number;
    handY: number;
    handCenterX: number;
    armorX: number;
    armorY: number;
}

/** Grid sits left of center; enemy is just to the right of the board. */
export const computeBoardLayout = (
    canvasWidth: number,
    canvasHeight: number,
): BoardLayout =>
{
    const { tileSize, cols, rows } = GRID_CONFIG;
    const { width: gridWidth, height: gridHeight } = getGridPixelSize();
    const enemySize = Math.round(tileSize * 1.15);
    const enemyGap = Math.round(tileSize * 0.45);
    const handBandHeight = HAND_CARD_HEIGHT + 36;
    const contentWidth = gridWidth + enemyGap + enemySize;
    const gridOffsetX = Math.round((canvasWidth - contentWidth) / 2 - tileSize * 0.35);
    const gridOffsetY = Math.round((canvasHeight - gridHeight - handBandHeight) / 2);
    const handY = canvasHeight - handBandHeight + 8;
    const handWidth = HAND_CARD_WIDTH * 3 + HAND_CARD_GAP * 2;

    return {
        canvasWidth,
        canvasHeight,
        gridOffsetX,
        gridOffsetY,
        gridWidth,
        gridHeight,
        tileSize,
        enemyX: gridOffsetX + gridWidth + enemyGap,
        enemyY: Math.round(gridOffsetY + (gridHeight - enemySize) / 2),
        enemySize,
        handY,
        handCenterX: Math.round(canvasWidth / 2 - handWidth / 2),
        armorX: Math.round(gridOffsetX + gridWidth / 2),
        armorY: gridOffsetY + gridHeight + 20,
    };
};
