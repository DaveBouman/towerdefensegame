import { GRID_WORLD_OFFSET_Y } from '../config/worldLayout';
import type { GridConfig, GridPosition, WorldPosition } from './types';

export const tileCenterWorld = (
    config: GridConfig,
    { col, row }: GridPosition,
): WorldPosition =>
{
    const half = config.tileSize / 2;

    return {
        x: col * config.tileSize + half,
        y: GRID_WORLD_OFFSET_Y + row * config.tileSize + half,
    };
};

export const worldDistance = (a: WorldPosition, b: WorldPosition): number =>
{
    const dx = a.x - b.x;
    const dy = a.y - b.y;

    return Math.sqrt(dx * dx + dy * dy);
};

export const copyWorldPosition = (position: WorldPosition): WorldPosition =>
({
    x: position.x,
    y: position.y,
});

/** Frame-rate independent lerp toward a simulation target. */
export const lerpWorldPosition = (
    current: WorldPosition,
    target: WorldPosition,
    deltaMs: number,
    smoothness: number,
): WorldPosition =>
{
    const t = 1 - Math.exp(-smoothness * (deltaMs / 1000));

    return {
        x: current.x + (target.x - current.x) * t,
        y: current.y + (target.y - current.y) * t,
    };
};

export const worldToTileLabel = (
    config: GridConfig,
    { x, y }: WorldPosition,
): string =>
{
    const localY = y - GRID_WORLD_OFFSET_Y;

    if (localY < 0)
    {
        return 'Enemy nexus';
    }

    if (localY >= config.rows * config.tileSize)
    {
        return 'Your nexus';
    }

    const col = Math.floor(x / config.tileSize);
    const row = Math.floor(localY / config.tileSize);

    return `${col}, ${row}`;
};
