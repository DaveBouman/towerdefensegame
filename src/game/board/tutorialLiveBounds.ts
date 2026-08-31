import type { CardBoardView } from './CardBoardView';
import type { CardHandView } from './CardHandView';
import {
    domElementToHostRect,
    normalizeHighlightRect,
    phaserBoundsToHostRect,
    type TutorialWizardViewportTargets,
    type ViewportRect,
} from './tutorialViewportRects';

export interface LiveTutorialTargetOptions {
    boardView: CardBoardView;
    handView: CardHandView;
    canvas: HTMLCanvasElement;
    canvasWidth: number;
    canvasHeight: number;
    /** Which chain-start row the coach should highlight (row A = 0 during chain-start step). */
    chainStartHighlightRow: number;
    /** Active chain row for card placement highlights. */
    chainPlacementRow: number;
}

const emptyRect = (): ViewportRect =>
({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
});

/** Sample spotlight rects from live Phaser objects + HUD DOM nodes. */
export const computeLiveTutorialTargets = (
    options: LiveTutorialTargetOptions,
): TutorialWizardViewportTargets | null =>
{
    const {
        boardView,
        handView,
        canvas,
        canvasWidth,
        canvasHeight,
        chainStartHighlightRow,
        chainPlacementRow,
    } = options;

    const toHost = (bounds: Phaser.Geom.Rectangle, minSize = 56): ViewportRect | null =>
    {
        const rect = phaserBoundsToHostRect(bounds, canvas, canvasWidth, canvasHeight);

        return rect ? normalizeHighlightRect(rect, minSize) : null;
    };

    const chainStartTile = toHost(boardView.getChainStartIndicatorBounds(chainStartHighlightRow), 64)
        ?? emptyRect();
    const chainRow = toHost(boardView.getChainRowBounds(chainPlacementRow), 48)
        ?? emptyRect();
    const hand = toHost(handView.getTutorialHandBounds(), 120) ?? emptyRect();
    const grid = toHost(boardView.getTutorialGridBounds(), 80) ?? emptyRect();

    const attackEl = document.querySelector('[data-tutorial-target="attack"]');
    const energyEl = document.querySelector('[data-tutorial-target="energy"]');

    return {
        chainStartTile,
        chainRow,
        hand,
        grid,
        attack: attackEl
            ? normalizeHighlightRect(domElementToHostRect(attackEl) ?? emptyRect(), 48, 6)
            : null,
        energy: energyEl
            ? normalizeHighlightRect(domElementToHostRect(energyEl) ?? emptyRect(), 48, 6)
            : null,
    };
};
