import { GRID_CONFIG } from '../config/gridConfig';
import { GAME_RULES } from '../cardGame/config/cardRegistry';
import {
    HAND_CARD_GAP,
    HAND_CARD_HEIGHT,
    HAND_CARD_WIDTH,
    PILE_CARD_HEIGHT,
    PILE_CARD_WIDTH,
} from '../cards/cardVisuals';

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
    handCardWidth: number;
    handCardHeight: number;
    handCardGap: number;
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
    hand: LayoutPositionable & { applyLayout?: (layout: BoardLayout) => void };
    enemy: LayoutPositionable;
    player: LayoutPositionable;
    armor: LayoutPositionable;
    deck: LayoutPositionable;
    graveyard: LayoutPositionable;
}

/** Design tile size at comfortable 1080p packing (`GRID_CONFIG.tileSize`). */
export const LAYOUT_REF_TILE = GRID_CONFIG.tileSize;
/** Floor so cards stay readable at 1280×720. */
export const LAYOUT_MIN_TILE = 64;

const HAND_W_RATIO = HAND_CARD_WIDTH / LAYOUT_REF_TILE;
const HAND_H_RATIO = HAND_CARD_HEIGHT / LAYOUT_REF_TILE;
const HAND_GAP_RATIO = HAND_CARD_GAP / LAYOUT_REF_TILE;
const HAND_DOCK_PAD_RATIO = 28 / LAYOUT_REF_TILE;
const PILE_W_RATIO = 86 / LAYOUT_REF_TILE;
const PILE_H_RATIO = 116 / LAYOUT_REF_TILE;
const PLAYER_SIZE_RATIO = 1.32;
const PLAYER_GAP_EXTRA_RATIO = 0.3;
const ENEMY_SIZE_RATIO = 1.75;
const SIDE_GAP_RATIO = 0.45;

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

    if (views.hand.applyLayout)
    {
        views.hand.applyLayout(layout);
    }
    else
    {
        views.hand.setPosition(layout.handCenterX, layout.handY);
    }

    views.enemy.setPosition(layout.enemyX, layout.enemyY);
    views.player.setPosition(layout.playerX, layout.playerY);
    views.armor.setPosition(layout.armorX, layout.armorY);
    views.deck.setPosition(layout.deckX, layout.deckY);
    views.graveyard.setPosition(layout.graveyardX, layout.graveyardY);
};

/**
 * Fits the 5×5 board, hand, armor strip, and side portraits into the canvas.
 * Tile / hand / pile sizes scale down from the 96px design when height is tight (720p).
 */
export const computeBoardLayout = (
    canvasWidth: number,
    canvasHeight: number,
): BoardLayout =>
{
    const { cols, rows } = GRID_CONFIG;
    const hudTopInset = Math.round(clamp(canvasHeight * 0.078, 40, 56));
    const armorBand = Math.round(clamp(canvasHeight * 0.072, 40, 52));
    const sideInset = 14;

    const heightDivisor = rows + HAND_H_RATIO + HAND_DOCK_PAD_RATIO;
    const maxTileByHeight = (canvasHeight - hudTopInset - armorBand) / heightDivisor;
    const widthDivisor = PLAYER_SIZE_RATIO + SIDE_GAP_RATIO + PLAYER_GAP_EXTRA_RATIO
        + cols + SIDE_GAP_RATIO + ENEMY_SIZE_RATIO;
    const maxTileByWidth = (canvasWidth - sideInset * 2) / widthDivisor;
    const tileSize = Math.max(
        LAYOUT_MIN_TILE,
        Math.min(LAYOUT_REF_TILE, Math.floor(Math.min(maxTileByHeight, maxTileByWidth))),
    );

    const gridWidth = cols * tileSize;
    const gridHeight = rows * tileSize;
    const enemySize = Math.round(tileSize * ENEMY_SIZE_RATIO);
    const playerSize = Math.round(tileSize * PLAYER_SIZE_RATIO);
    const enemyGap = Math.round(tileSize * SIDE_GAP_RATIO);
    const playerGap = enemyGap + Math.round(tileSize * PLAYER_GAP_EXTRA_RATIO);
    const handCardWidth = Math.max(48, Math.round(tileSize * HAND_W_RATIO));
    const handCardHeight = Math.max(66, Math.round(tileSize * HAND_H_RATIO));
    const handCardGap = Math.max(8, Math.round(tileSize * HAND_GAP_RATIO));
    const handDockPad = Math.max(16, Math.round(tileSize * HAND_DOCK_PAD_RATIO));
    const handBandHeight = handCardHeight + handDockPad;
    const gridOffsetX = Math.round((canvasWidth - gridWidth) / 2);
    const handY = canvasHeight - handBandHeight + Math.round(handDockPad * 0.14);
    const availableHeight = canvasHeight - hudTopInset - armorBand - handBandHeight;
    const gridOffsetY = hudTopInset + Math.round(Math.max(0, availableHeight - gridHeight) / 2);
    const handWidth = handCardWidth * GAME_RULES.handSize + handCardGap * (GAME_RULES.handSize - 1);
    const handCenterX = Math.round(canvasWidth / 2 - handWidth / 2);
    const pileWidth = Math.max(PILE_CARD_WIDTH, Math.round(tileSize * PILE_W_RATIO));
    const pileHeight = Math.max(PILE_CARD_HEIGHT, Math.round(tileSize * PILE_H_RATIO));
    const pileFrameWidth = pileWidth + 10;
    const pileFrameHeight = pileHeight + 8;
    const deckX = sideInset;
    const graveyardX = canvasWidth - pileFrameWidth - sideInset;
    const pileY = canvasHeight - Math.round(pileFrameHeight * 0.48);
    const gridBottom = gridOffsetY + gridHeight;

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
        handCardWidth,
        handCardHeight,
        handCardGap,
        armorX: Math.round(gridOffsetX + gridWidth / 2),
        armorY: Math.round(gridBottom + armorBand / 2),
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

const clamp = (value: number, min: number, max: number): number =>
    Math.min(max, Math.max(min, value));
