import type { WorldPosition } from '../grid/types';

export interface SeparationNeighbor {
    id: string;
    position: WorldPosition;
    radius: number;
}

/** Soft local avoidance — pushes units apart without grid sidestep roulette. */
export const computeSeparationOffset = (
    unitId: string,
    position: WorldPosition,
    neighbors: readonly SeparationNeighbor[],
    bodyRadius: number,
    maxPush: number,
): WorldPosition =>
{
    let offsetX = 0;
    let offsetY = 0;

    for (const neighbor of neighbors)
    {
        if (neighbor.id === unitId)
        {
            continue;
        }

        const dx = position.x - neighbor.position.x;
        const dy = position.y - neighbor.position.y;
        const distance = Math.hypot(dx, dy);
        const comfort = (neighbor.radius + bodyRadius) * 2.25;

        if (distance < 0.001 || distance >= comfort)
        {
            continue;
        }

        const weight = (comfort - distance) / comfort;

        offsetX += (dx / distance) * weight;
        offsetY += (dy / distance) * weight;
    }

    const magnitude = Math.hypot(offsetX, offsetY);

    if (magnitude <= 0.001)
    {
        return { x: 0, y: 0 };
    }

    if (magnitude <= maxPush)
    {
        return { x: offsetX, y: offsetY };
    }

    const scale = maxPush / magnitude;

    return { x: offsetX * scale, y: offsetY * scale };
};
