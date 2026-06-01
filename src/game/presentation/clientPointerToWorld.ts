import type { Scene } from 'phaser';

export const clientPointerToWorld = (
    scene: Scene,
    clientX: number,
    clientY: number,
): { x: number; y: number } | null =>
{
    const canvas = scene.game.canvas;
    const rect = canvas.getBoundingClientRect();

    if (rect.width <= 0 || rect.height <= 0)
    {
        return null;
    }

    const camera = scene.cameras.main;
    const screenX = ((clientX - rect.left) / rect.width) * camera.width;
    const screenY = ((clientY - rect.top) / rect.height) * camera.height;

    return camera.getWorldPoint(screenX, screenY);
};
