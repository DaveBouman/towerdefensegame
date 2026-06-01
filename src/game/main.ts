import { getViewportPixelSize } from './config/gridConfig';
import { Game as MainGame } from './scenes/Game';
import { AUTO, Game } from 'phaser';

const { width, height } = getViewportPixelSize();

const config: Phaser.Types.Core.GameConfig = {
    type: AUTO,
    width,
    height,
    backgroundColor: '#0f0f1a',
    scene: [ MainGame ],
    render: {
        antialias: false,
        powerPreference: 'high-performance',
    },
};

const StartGame = (parent: HTMLElement | string) => new Game({
    ...config,
    parent,
});

export default StartGame;
