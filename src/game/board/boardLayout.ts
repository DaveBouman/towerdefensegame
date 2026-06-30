import { GRID_CONFIG, getGridPixelSize } from '../config/gridConfig';
import { GAME_RULES } from '../cardGame/config/cardRegistry';
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
    playerX: number;
    playerY: number;
    playerSize: number;
    deckX: number;
    deckY: number;
    graveyardX: number;
    graveyardY: number;
    pileWidth: number;
    pileHeight: number;
}

export interface LayoutPositionable {
    setPosition (x: number, y: number): void;
}

export interface BoardLayoutViews {
    board: LayoutPositionable & { applyLayout?: (layout: BoardLayout) => void };
    hand: LayoutPositionable;
    enemy: LayoutPositionable;
    player: LayoutPositionable;
    armor: LayoutPositionable;
    deck: LayoutPositionable;
    graveyard: LayoutPositionable;
}

/** Repositions scene containers after a canvas resize. */
export const applyBoardLayout = (layout: BoardLayout, views: BoardLayoutViews): void =>
{
    if (views.board.applyLayout)
    {
        views.board.applyLayout(layout);
    }
    else
    {
        views.board.setPosition(layout.gridOffsetX, layout.gridOffsetY);
    }

    views.hand.setPosition(layout.handCenterX, layout.handY);
    views.enemy.setPosition(layout.enemyX, layout.enemyY);
    views.player.setPosition(layout.playerX, layout.playerY);
    views.armor.setPosition(layout.armorX, layout.armorY);
    views.deck.setPosition(layout.deckX, layout.deckY);
    views.graveyard.setPosition(layout.graveyardX, layout.graveyardY);
};

/** Grid sits left of center; enemy is just to the right of the board. */
export const computeBoardLayout = (
    canvasWidth: number,
    canvasHeight: number,
): BoardLayout =>
{
    const { tileSize, cols, rows } = GRID_CONFIG;
    const { width: gridWidth, height: gridHeight } = getGridPixelSize();
    const enemySize = Math.round(tileSize * 1.15);
    const playerSize = enemySize;
    const enemyGap = Math.round(tileSize * 0.45);
    const handBandHeight = HAND_CARD_HEIGHT + 36;
    const hudTopInset = 56;
    const contentWidth = gridWidth + enemyGap + enemySize;
    const handY = canvasHeight - handBandHeight + 8;
    const availableHeight = canvasHeight - hudTopInset - handBandHeight;
    const gridOffsetX = Math.round((canvasWidth - contentWidth) / 2 - tileSize * 0.35);
    const gridOffsetY = hudTopInset + Math.round(Math.max(0, availableHeight - gridHeight) / 2);
    const handWidth = HAND_CARD_WIDTH * GAME_RULES.handSize + HAND_CARD_GAP * (GAME_RULES.handSize - 1);
    const pileWidth = 64;
    const pileHeight = 88;
    const pileMargin = 16;
    const pileFrameWidth = pileWidth + 12;
    const pileY = Math.round(handY + (handBandHeight - pileHeight) / 2);
    const deckX = pileMargin;
    const graveyardX = canvasWidth - pileFrameWidth - pileMargin;

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
        playerX: Math.round(gridOffsetX - playerSize - enemyGap),
        playerY: Math.round(gridOffsetY + (gridHeight - playerSize) / 2),
        playerSize,
        deckX,
        deckY: pileY,
        graveyardX,
        graveyardY: pileY,
        pileWidth,
        pileHeight,
    };
};
