import { Game as MainGame } from './scenes/Game';
import { isDesktopShell } from './desktop/desktopBridge';
import { AUTO, Game, Scale } from 'phaser';

const readParentSize = (parent: HTMLElement | string): { width: number; height: number } =>
{
    const element = typeof parent === 'string'
        ? document.getElementById(parent)
        : parent;

    if (element)
    {
        return {
            width: Math.max(1, element.clientWidth),
            height: Math.max(1, element.clientHeight),
        };
    }

    return {
        width: Math.max(1, window.innerWidth),
        height: Math.max(1, window.innerHeight),
    };
};

const desktop = isDesktopShell();

const config: Phaser.Types.Core.GameConfig = {
    type: AUTO,
    backgroundColor: '#0c0812',
    scene: [ MainGame ],
    scale: {
        mode: Scale.RESIZE,
        autoCenter: Scale.CENTER_BOTH,
    },
    // Cap frame pacing so packaged builds don't run uncapped and thermal-throttle.
    fps: {
        target: 60,
        min: 30,
        smoothStep: true,
    },
    render: {
        // Keep AA + subpixel text — disabling these made HUD/menu type look blocky.
        antialias: true,
        roundPixels: false,
        powerPreference: 'high-performance',
    },
    ...(desktop
        ? {
            // HTML5 audio is more reliable than Web Audio under Electron packaging.
            audio: { disableWebAudio: true },
        }
        : {}),
};

const StartGame = (parent: HTMLElement | string) =>
{
    const { width, height } = readParentSize(parent);

    return new Game({
        ...config,
        width,
        height,
        parent,
    });
};

export default StartGame;