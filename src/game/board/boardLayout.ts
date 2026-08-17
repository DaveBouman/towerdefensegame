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
    exhaustX: number;
    exhaustY: number;
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
    exhaust: LayoutPositionable;
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
    views.exhaust.setPosition(layout.exhaustX, layout.exhaustY);
};

/** 5×5 grid centered on screen; player left, enemies right. */
export const computeBoardLayout = (
    canvasWidth: number,
    canvasHeight: number,
): BoardLayout =>
{
    const { tileSize } = GRID_CONFIG;
    const { width: gridWidth, height: gridHeight } = getGridPixelSize();
    const enemySize = Math.round(tileSize * 1.85);
    const playerSize = Math.round(tileSize * 1.38);
    const enemyGap = Math.round(tileSize * 0.55);
    // Extra clearance for chain-start arrows + row letter legend left of the grid.
    const playerGap = enemyGap + Math.round(tileSize * 0.35);
    const handBandHeight = HAND_CARD_HEIGHT + 52;
    const hudTopInset = 72;
    const gridOffsetX = Math.round((canvasWidth - gridWidth) / 2);
    const handY = canvasHeight - handBandHeight + 8;
    const availableHeight = canvasHeight - hudTopInset - handBandHeight;
    const gridOffsetY = hudTopInset + Math.round(Math.max(0, availableHeight - gridHeight) / 2);
    const handWidth = HAND_CARD_WIDTH * GAME_RULES.handSize + HAND_CARD_GAP * (GAME_RULES.handSize - 1);
    const pileWidth = 64;
    const pileHeight = 88;
    const pileFrameWidth = pileWidth + 12;
    const pileFrameHeight = pileHeight + 34;
    const playableTop = hudTopInset;
    const playableBottom = handY;
    const pileCenterY = playableTop + (playableBottom - playableTop) * (2 / 3);
    const pileY = Math.round(Math.min(pileCenterY - pileFrameHeight / 2, handY - pileFrameHeight - 12));
    const pileSideInset = Math.max(48, Math.round(canvasWidth * 0.05));
    const deckX = pileSideInset;
    const graveyardX = canvasWidth - pileFrameWidth - pileSideInset;
    const exhaustX = graveyardX;
    const exhaustY = Math.max(playableTop, pileY - pileFrameHeight - 10);

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
        playerX: Math.round(gridOffsetX - playerSize - playerGap),
        playerY: Math.round(gridOffsetY + (gridHeight - playerSize) / 2),
        playerSize,
        deckX,
        deckY: pileY,
        graveyardX,
        graveyardY: pileY,
        exhaustX,
        exhaustY,
        pileWidth,
        pileHeight,
    };
};
