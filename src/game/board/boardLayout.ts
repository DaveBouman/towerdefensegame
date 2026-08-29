import { GRID_CONFIG } from '../config/gridConfig';
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

/** 5×5 grid centered on screen; player left, enemies right. */
export const computeBoardLayout = (
    canvasWidth: number,
    canvasHeight: number,
): BoardLayout =>
{
    const { tileSize } = GRID_CONFIG;
    const gridWidth = GRID_CONFIG.cols * tileSize;
    const gridHeight = GRID_CONFIG.rows * tileSize;
    const enemySize = Math.round(tileSize * 1.75);
    const playerSize = Math.round(tileSize * 1.32);
    const enemyGap = Math.round(tileSize * 0.45);
    // Extra clearance for chain-start arrows + row letter legend left of the grid.
    const playerGap = enemyGap + Math.round(tileSize * 0.3);
    const handBandHeight = HAND_CARD_HEIGHT + 28;
    // Clearance for React GameHud (energy / hints / Attack) above the grid.
    const hudTopInset = 92;
    const gridOffsetX = Math.round((canvasWidth - gridWidth) / 2);
    const handY = canvasHeight - handBandHeight + 4;
    const availableHeight = canvasHeight - hudTopInset - handBandHeight;
    const gridOffsetY = hudTopInset + Math.round(Math.max(0, availableHeight - gridHeight) / 2);
    const handWidth = HAND_CARD_WIDTH * GAME_RULES.handSize + HAND_CARD_GAP * (GAME_RULES.handSize - 1);
    const handCenterX = Math.round(canvasWidth / 2 - handWidth / 2);
    // Docked to bottom corners — half off-screen until hover reveals them.
    const pileWidth = 86;
    const pileHeight = 116;
    const pileFrameWidth = pileWidth + 10;
    const pileFrameHeight = pileHeight + 8;
    const sideInset = 14;
    const deckX = sideInset;
    const graveyardX = canvasWidth - pileFrameWidth - sideInset;
    // ~52% of the tray hangs below the canvas so only a peek shows at rest.
    const pileY = canvasHeight - Math.round(pileFrameHeight * 0.48);

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
        handCenterX,
        armorX: Math.round(gridOffsetX + gridWidth / 2),
        armorY: gridOffsetY + gridHeight + 16,
        playerX: Math.round(gridOffsetX - playerSize - playerGap),
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
