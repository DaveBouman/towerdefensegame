/** Converts Phaser 0xRRGGBB catalog colors to CSS hex. */
export const phaserColorToCss = (color: number): string =>
{
    const r = (color >> 16) & 0xff;
    const g = (color >> 8) & 0xff;
    const b = color & 0xff;

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

const DRAG_GHOST_SIZE_PX = 48;

/** Shows the tower square (not list text) while dragging from the roster. */
export const setTowerDragImage = (event: DragEvent, color: number): void =>
{
    const hex = phaserColorToCss(color);
    const ghost = document.createElement('div');

    ghost.className = 'tower-drag-ghost';
    ghost.style.width = `${DRAG_GHOST_SIZE_PX}px`;
    ghost.style.height = `${DRAG_GHOST_SIZE_PX}px`;
    ghost.style.backgroundColor = hex;
    ghost.style.borderColor = hex;
    ghost.style.position = 'fixed';
    ghost.style.top = '-1000px';
    ghost.style.left = '-1000px';
    ghost.style.pointerEvents = 'none';

    document.body.appendChild(ghost);
    event.dataTransfer.setDragImage(ghost, DRAG_GHOST_SIZE_PX / 2, DRAG_GHOST_SIZE_PX / 2);

    const cleanup = (): void =>
    {
        ghost.remove();
        document.removeEventListener('dragend', cleanup);
    };

    document.addEventListener('dragend', cleanup);
};
