/** Product metadata for menus, window titles, and future Electron/Steam packaging. */

declare const __APP_VERSION__: string;

export const GAME_TITLE = 'Signal Chain';
export const GAME_TAGLINE = 'Card-chain gauntlet';
/** Synced from `package.json` at build/dev-server start via Vite `define`. */
export const GAME_VERSION = __APP_VERSION__;
export const GAME_BUILD_LABEL = 'Early Access';
export const GAME_EARLY_ACCESS_NOTICE =
    'This is an Early Access title. Balance, content, and features are still evolving — feedback welcome.';
