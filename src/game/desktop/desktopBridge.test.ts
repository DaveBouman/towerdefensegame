import { beforeEach, describe, expect, it, vi } from 'vitest';
import { isDesktopShell, quitGame, setGameFullscreen } from './desktopBridge';

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

        window.signalChainDesktop = {
            quit: vi.fn(),
            setFullscreen,
        };

        await setGameFullscreen(true);
        expect(setFullscreen).toHaveBeenCalledWith(true);
    });
});
