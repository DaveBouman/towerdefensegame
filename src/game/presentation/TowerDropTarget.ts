import type { Scene } from 'phaser';
import type { TowerState } from '../domain/TowerState';
import { clientPointerToWorld } from './clientPointerToWorld';

export class TowerDropTarget
{
    constructor (
        private readonly scene: Scene,
        private readonly getTowers: () => readonly TowerState[],
    ) {}

    resolveTowerIdAtScreen (clientX: number, clientY: number): string | null
    {
        const world = clientPointerToWorld(this.scene, clientX, clientY);

        if (!world)
        {
            return null;
        }

        return this.pickTowerAtWorld(world)?.id ?? null;
    }

    private pickTowerAtWorld (world: { x: number; y: number }): TowerState | undefined
    {
        let best: TowerState | undefined;
        let bestDistSq = Infinity;

        for (const tower of this.getTowers())
        {
            const dx = Math.abs(world.x - tower.position.x);
            const dy = Math.abs(world.y - tower.position.y);

            if (dx > tower.bodyHalfWidth || dy > tower.bodyHalfHeight)
            {
                continue;
            }

            const distSq = dx * dx + dy * dy;

            if (distSq < bestDistSq)
            {
                bestDistSq = distSq;
                best = tower;
            }
        }

        return best;
    }
}
