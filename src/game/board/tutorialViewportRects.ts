import { getGameViewportElement } from '../ui/gameViewport';

export interface ViewportRect {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface TutorialWizardViewportTargets {
    chainStartTile: ViewportRect;
    chainRow: ViewportRect;
    hand: ViewportRect;
    grid: ViewportRect;
    attack: ViewportRect | null;
    energy: ViewportRect | null;
}

/** Live layout sample emitted from the Phaser scene to the coach overlay. */
export interface TutorialWizardLayoutPayload extends TutorialWizardViewportTargets {
    handDragging: boolean;
}

export const clientRectToHostRect = (
    clientRect: { left: number; top: number; width: number; height: number },
    hostRect: { left: number; top: number },
): ViewportRect =>
({
    x: clientRect.left - hostRect.left,
    y: clientRect.top - hostRect.top,
    width: clientRect.width,
    height: clientRect.height,
});

/** Convert Phaser world bounds (canvas pixels) to `#game-viewport` local coordinates. */
export const phaserBoundsToHostRect = (
    bounds: Phaser.Geom.Rectangle,
    canvas: HTMLCanvasElement,
    canvasWidth: number,
    canvasHeight: number,
): ViewportRect | null =>
{
    const host = getGameViewportElement();

    if (!host || bounds.width <= 0 || bounds.height <= 0)
    {
        return null;
    }

    const hostRect = host.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    const scaleX = canvasWidth > 0 ? canvasRect.width / canvasWidth : 1;
    const scaleY = canvasHeight > 0 ? canvasRect.height / canvasHeight : 1;

    return clientRectToHostRect(
        {
            left: canvasRect.left + bounds.x * scaleX,
            top: canvasRect.top + bounds.y * scaleY,
            width: bounds.width * scaleX,
            height: bounds.height * scaleY,
        },
        hostRect,
    );
};

export const domElementToHostRect = (element: Element): ViewportRect | null =>
{
    const host = getGameViewportElement();

    if (!host)
    {
        return null;
    }

    return clientRectToHostRect(element.getBoundingClientRect(), host.getBoundingClientRect());
};

export const getGameHostSize = (): { width: number; height: number } =>
{
    const host = getGameViewportElement()?.getBoundingClientRect();

    if (!host)
    {
        return {
            width: window.innerWidth,
            height: window.innerHeight,
        };
    }

    return {
        width: host.width,
        height: host.height,
    };
};

/** Expand tiny bounds and add breathing room so the ring is easy to see. */
export const normalizeHighlightRect = (
    rect: ViewportRect,
    minSize = 56,
    pad = 8,
): ViewportRect =>
{
    const width = Math.max(rect.width + pad * 2, minSize);
    const height = Math.max(rect.height + pad * 2, minSize);

    return {
        x: rect.x + rect.width / 2 - width / 2,
        y: rect.y + rect.height / 2 - height / 2,
        width,
        height,
    };
};
