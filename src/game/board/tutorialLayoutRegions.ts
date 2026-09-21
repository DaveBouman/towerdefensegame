/**
 * @deprecated Layout math for tutorial targets — superseded by live Phaser `getBounds()`.
 * Kept only as reference; not used at runtime.
 */
import type { BoardLayout } from './boardLayout';

export interface TutorialLayoutRegion {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface TutorialLayoutRegions {
    chainStartTile: TutorialLayoutRegion;
    hand: TutorialLayoutRegion;
    grid: TutorialLayoutRegion;
}

export interface TutorialLayoutPayload {
    regions: TutorialLayoutRegions;
    canvasWidth: number;
    canvasHeight: number;
}

export const getGridTileRegion = (
    layout: BoardLayout,
    row: number,
    col: number,
): TutorialLayoutRegion =>
{
    const { tileSize } = layout;

    return {
        x: layout.gridOffsetX + col * tileSize,
        y: layout.gridOffsetY + row * tileSize,
        width: tileSize,
        height: tileSize,
    };
};

export const getTutorialLayoutRegions = (layout: BoardLayout): TutorialLayoutRegions =>
{
    const handSpan = layout.handCardWidth * 3 + layout.handCardGap * 2;

    return {
        chainStartTile: getGridTileRegion(layout, 0, 0),
        hand: {
            x: layout.handCenterX - handSpan / 2,
            y: layout.handY - layout.handCardHeight / 2 - 8,
            width: handSpan,
            height: layout.handCardHeight + 24,
        },
        grid: {
            x: layout.gridOffsetX,
            y: layout.gridOffsetY,
            width: layout.gridWidth,
            height: layout.gridHeight,
        },
    };
};

export const getTutorialLayoutPayload = (layout: BoardLayout): TutorialLayoutPayload =>
({
    regions: getTutorialLayoutRegions(layout),
    canvasWidth: layout.canvasWidth,
    canvasHeight: layout.canvasHeight,
});
