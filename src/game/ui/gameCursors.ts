import { getGameViewportElement } from './gameViewport';
import {
    buildCursorUrls,
    readCursorColor,
    subscribeGameCursors,
    type CursorColor,
    type GameCursorUrls,
} from './cursorSettings';

export type { CursorColor, GameCursorUrls };

export { applyCursorColor, readCursorColor, setCursorColor, subscribeGameCursors } from './cursorSettings';

export const getGameCursors = (): GameCursorUrls => buildCursorUrls(readCursorColor());

const GRABBING_CLASS = 'game-viewport--grabbing';

export const setViewportGrabbingCursor = (active: boolean): void =>
{
    getGameViewportElement()?.classList.toggle(GRABBING_CLASS, active);
};
