import type { TowerDefinitionId } from '../config/towerCatalog';
import type { DeploymentSnapshot } from './types';

export class DeploymentPhase
{
    private queue: TowerDefinitionId[] = [];
    private totalCount = 0;

    beginWithQueue (towerIds: readonly TowerDefinitionId[]): void
    {
        this.queue = [ ...towerIds ];
        this.totalCount = towerIds.length;
    }

    reset (): void
    {
        this.queue = [];
        this.totalCount = 0;
    }

    get active (): boolean
    {
        return this.queue.length > 0;
    }

    peekNext (): TowerDefinitionId | null
    {
        return this.queue[0] ?? null;
    }

    takeNext (): TowerDefinitionId | null
    {
        return this.queue.shift() ?? null;
    }

    snapshot (): DeploymentSnapshot
    {
        const placedCount = this.totalCount - this.queue.length;

        return {
            active: this.active,
            nextTowerId: this.peekNext(),
            placedCount,
            totalCount: this.totalCount,
        };
    }
}
