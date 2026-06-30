import { Game as MainGame } from './scenes/Game';
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

const config: Phaser.Types.Core.GameConfig = {
    type: AUTO,
    backgroundColor: '#0f0f1a',
    scene: [ MainGame ],
    scale: {
        mode: Scale.RESIZE,
        autoCenter: Scale.CENTER_BOTH,
    },
    render: {
        antialias: false,
        powerPreference: 'high-performance',
    },
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