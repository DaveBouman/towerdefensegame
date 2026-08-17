/** Design-time 16:9 frame — canvas + React overlays share this aspect. */
export const GAME_VIEWPORT_ID = 'game-viewport';
export const GAME_ASPECT_WIDTH = 16;
export const GAME_ASPECT_HEIGHT = 9;
export const GAME_ASPECT = GAME_ASPECT_WIDTH / GAME_ASPECT_HEIGHT;
export const GAME_MIN_WIDTH = 960;
export const GAME_MIN_HEIGHT = 540;

export const computeViewportSize = (
    windowWidth: number,
    windowHeight: number,
): { width: number; height: number } =>
{
    const safeWidth = Math.max(1, windowWidth);
    const safeHeight = Math.max(1, windowHeight);
    const height = Math.min(safeHeight, safeWidth / GAME_ASPECT);
    const width = height * GAME_ASPECT;

    return {
        width: Math.max(1, Math.round(width)),
        height: Math.max(1, Math.round(height)),
    };
};

export const getGameViewportElement = (): HTMLElement | null =>
    document.getElementById(GAME_VIEWPORT_ID);

export const getGameViewportRect = (): DOMRectReadOnly =>
{
    const viewport = getGameViewportElement();

    if (viewport)
    {
        return viewport.getBoundingClientRect();
    }

    return new DOMRect(0, 0, window.innerWidth, window.innerHeight);
};
