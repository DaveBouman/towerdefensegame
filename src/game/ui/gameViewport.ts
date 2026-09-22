/** Design-time 16:9 frame — canvas + React overlays share this aspect. */
export const GAME_VIEWPORT_ID = 'game-viewport';
export const GAME_ASPECT_WIDTH = 16;
export const GAME_ASPECT_HEIGHT = 9;
export const GAME_ASPECT = GAME_ASPECT_WIDTH / GAME_ASPECT_HEIGHT;
export const GAME_MIN_WIDTH = 1280;
export const GAME_MIN_HEIGHT = 720;
/** Reference height for UI scale (720p). Overlays use --ui-scale = height / this. */
export const GAME_UI_REF_HEIGHT = 720;
export const GAME_UI_SCALE_MIN = 0.7;
export const GAME_UI_SCALE_MAX = 1.2;

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

export const computeUiScale = (viewportHeight: number): number =>
{
    const raw = viewportHeight / GAME_UI_REF_HEIGHT;
    const clamped = Math.min(GAME_UI_SCALE_MAX, Math.max(GAME_UI_SCALE_MIN, raw));

    // Prefer exact 1× near 720p so CSS type stays on whole pixels (avoids soft buttons).
    if (Math.abs(clamped - 1) < 0.06)
    {
        return 1;
    }

    // Keep clamp endpoints exact; quarter-snap the mid range for sharper calc() fonts.
    if (clamped === GAME_UI_SCALE_MIN || clamped === GAME_UI_SCALE_MAX)
    {
        return clamped;
    }

    return Math.round(clamped * 4) / 4;
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

/** Writes --ui-scale on #game-viewport so overlays scale with resolution. */
export const syncGameViewportUiScale = (): number =>
{
    const viewport = getGameViewportElement();

    if (!viewport)
    {
        return 1;
    }

    const scale = computeUiScale(viewport.getBoundingClientRect().height);
    viewport.style.setProperty('--ui-scale', String(scale));

    return scale;
};
