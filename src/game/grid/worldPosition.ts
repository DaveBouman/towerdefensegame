import { worldLayoutFor } from '../config/worldLayout';
import type { GridConfig, GridPosition, WorldPosition } from './types';

export const tileCenterWorld = (
    config: GridConfig,
    tile: GridPosition,
): WorldPosition =>
    worldLayoutFor(config).gridTileCenter(tile);

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
    position: WorldPosition,
): string =>
    worldLayoutFor(config).worldToTileLabel(position);
