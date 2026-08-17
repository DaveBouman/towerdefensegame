import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    isDesktopShell,
    quitGame,
    readGameFullscreen,
    setGameFullscreen,
    subscribeGameFullscreen,
} from './desktopBridge';

const createWindowStub = () =>
{
    const store: { signalChainDesktop?: unknown; close: ReturnType<typeof vi.fn> } = {
        close: vi.fn(),
    };

    return store as unknown as Window & typeof globalThis;
};

describe('desktopBridge', () =>
{
    beforeEach(() =>
    {
        const stub = createWindowStub();

        vi.stubGlobal('window', stub);
        vi.stubGlobal('document', {
            fullscreenElement: null,
            documentElement: {
                requestFullscreen: vi.fn(async () => undefined),
            },
            exitFullscreen: vi.fn(async () => undefined),
        });
    });

    it('detects the desktop shell when the preload API is present', () =>
    {
        expect(isDesktopShell()).toBe(false);
        (window as Window).signalChainDesktop = { quit: vi.fn() };
        expect(isDesktopShell()).toBe(true);
    });

    it('prefers the desktop quit hook over window.close', () =>
    {
        const quit = vi.fn();

        window.signalChainDesktop = { quit };
        quitGame();

        expect(quit).toHaveBeenCalledOnce();
        expect(window.close).not.toHaveBeenCalled();
    });

    it('routes fullscreen through the desktop API when available', async () =>
    {
        const setFullscreen = vi.fn();
        const getFullscreen = vi.fn(async () => true);

        window.signalChainDesktop = {
            quit: vi.fn(),
            setFullscreen,
            getFullscreen,
        };

        await expect(setGameFullscreen(true)).resolves.toBe(true);
        expect(setFullscreen).toHaveBeenCalledWith(true);
        expect(getFullscreen).toHaveBeenCalled();
    });

    it('reads desktop fullscreen state when available', async () =>
    {
        window.signalChainDesktop = {
            quit: vi.fn(),
            getFullscreen: vi.fn(async () => true),
        };

        await expect(readGameFullscreen()).resolves.toBe(true);
    });

    it('subscribes to desktop fullscreen changes when available', () =>
    {
        const unsubscribe = vi.fn();
        const onFullscreenChange = vi.fn(() => unsubscribe);

        window.signalChainDesktop = {
            quit: vi.fn(),
            onFullscreenChange,
        };

        const listener = vi.fn();
        const cleanup = subscribeGameFullscreen(listener);

        expect(onFullscreenChange).toHaveBeenCalledWith(listener);
        expect(cleanup).toBe(unsubscribe);
    });

    it('treats Steam as optional on the desktop API', () =>
    {
        window.signalChainDesktop = { quit: vi.fn() };
        expect(window.signalChainDesktop.steam).toBeUndefined();

        window.signalChainDesktop = {
            quit: vi.fn(),
            steam: {
                isAvailable: () => true,
                getLocalPersona: () => null,
                getFriends: () => [],
            },
        };
        expect(window.signalChainDesktop.steam?.isAvailable?.()).toBe(true);
    });
});
