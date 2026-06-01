import { Input, Math as PhaserMath } from 'phaser';
import type { Scene } from 'phaser';
import { CAMERA_PAN_PX_PER_SEC } from '../config/cameraConfig';
import type { GridPixelSize } from '../grid/types';

const isTypingInFormField = (): boolean =>
{
    const active = document.activeElement;

    if (!active || !(active instanceof HTMLElement))
    {
        return false;
    }

    return Boolean(active.closest('input, textarea, select, [contenteditable="true"]'));
};

export class CameraPanController
{
    private keys: {
        up: Input.Keyboard.Key;
        down: Input.Keyboard.Key;
        left: Input.Keyboard.Key;
        right: Input.Keyboard.Key;
    } | null = null;

    constructor (
        private readonly scene: Scene,
        private readonly worldSize: GridPixelSize,
    )
    {
        const keyboard = scene.input.keyboard;

        if (!keyboard)
        {
            return;
        }

        this.keys = {
            up: keyboard.addKey(Input.Keyboard.KeyCodes.W),
            down: keyboard.addKey(Input.Keyboard.KeyCodes.S),
            left: keyboard.addKey(Input.Keyboard.KeyCodes.A),
            right: keyboard.addKey(Input.Keyboard.KeyCodes.D),
        };

        const camera = scene.cameras.main;

        camera.setBounds(0, 0, worldSize.width, worldSize.height);
        camera.setScroll(
            PhaserMath.Clamp(camera.scrollX, 0, this.getMaxScrollX()),
            PhaserMath.Clamp(camera.scrollY, 0, this.getMaxScrollY()),
        );
    }

    getScrollY (): number
    {
        return this.scene.cameras.main.scrollY;
    }

    getMaxScrollY (): number
    {
        const camera = this.scene.cameras.main;

        return Math.max(0, this.worldSize.height - camera.height);
    }

    setScrollY (scrollY: number): void
    {
        const camera = this.scene.cameras.main;

        camera.setScroll(
            camera.scrollX,
            PhaserMath.Clamp(scrollY, 0, this.getMaxScrollY()),
        );
    }

    update (deltaMs: number): boolean
    {
        if (!this.keys || isTypingInFormField())
        {
            return false;
        }

        const camera = this.scene.cameras.main;
        const step = (CAMERA_PAN_PX_PER_SEC * deltaMs) / 1000;
        let dx = 0;
        let dy = 0;

        if (this.keys.up.isDown)
        {
            dy -= step;
        }

        if (this.keys.down.isDown)
        {
            dy += step;
        }

        if (this.keys.left.isDown)
        {
            dx -= step;
        }

        if (this.keys.right.isDown)
        {
            dx += step;
        }

        if (dx === 0 && dy === 0)
        {
            return false;
        }

        const previousY = camera.scrollY;

        camera.setScroll(
            PhaserMath.Clamp(camera.scrollX + dx, 0, this.getMaxScrollX()),
            PhaserMath.Clamp(camera.scrollY + dy, 0, this.getMaxScrollY()),
        );

        return camera.scrollY !== previousY;
    }

    private getMaxScrollX (): number
    {
        const camera = this.scene.cameras.main;

        return Math.max(0, this.worldSize.width - camera.width);
    }

    destroy (): void
    {
        this.keys = null;
    }
}
