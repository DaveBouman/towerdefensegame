/**
 * Thin bridge for a future Electron/Steam shell.
 * The renderer never imports Electron; the packaged app injects `window.signalChainDesktop`.
 */

/** Steam persona snapshot from the desktop shell (avatars as data URLs or CDN URLs). */
export interface SteamPersona {
    steamId: string;
    personaName: string;
    avatarUrl: string;
}

export interface SignalChainSteamApi {
    isAvailable?: () => boolean | Promise<boolean>;
    getLocalPersona?: () => SteamPersona | null | Promise<SteamPersona | null>;
    getFriends?: () => SteamPersona[] | Promise<SteamPersona[]>;
}

export interface SignalChainDesktopApi {
    quit: () => void;
    setFullscreen?: (enabled: boolean) => void;
    getFullscreen?: () => boolean | Promise<boolean>;
    openExternal?: (url: string) => void;
    platform?: 'win32' | 'darwin' | 'linux' | string;
    steam?: SignalChainSteamApi;
}

declare global {
    interface Window {
        signalChainDesktop?: SignalChainDesktopApi;
    }
}

export const getDesktopApi = (): SignalChainDesktopApi | undefined =>
{
    if (typeof window === 'undefined')
    {
        return undefined;
    }

    return window.signalChainDesktop;
};

export const isDesktopShell = (): boolean => Boolean(getDesktopApi());

/** Quits the packaged app; in the browser attempts to close the tab/window. */
export const quitGame = (): void =>
{
    const desktop = getDesktopApi();

    if (desktop?.quit)
    {
        desktop.quit();
        return;
    }

    window.close();
};

export const isDocumentFullscreen = (): boolean =>
    Boolean(document.fullscreenElement);

export const setGameFullscreen = async (enabled: boolean): Promise<void> =>
{
    const desktop = getDesktopApi();

    if (desktop?.setFullscreen)
    {
        desktop.setFullscreen(enabled);
        return;
    }

    try
    {
        if (enabled && !document.fullscreenElement)
        {
            await document.documentElement.requestFullscreen();
            return;
        }

        if (!enabled && document.fullscreenElement)
        {
            await document.exitFullscreen();
        }
    }
    catch
    {
        /* Browser blocked fullscreen without a gesture / unsupported. */
    }
};
