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

    enqueue (towerId: TowerDefinitionId): void
    {
        this.queue.push(towerId);
        this.totalCount += 1;
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

    takeById (towerId: TowerDefinitionId): TowerDefinitionId | null
    {
        const index = this.queue.indexOf(towerId);

        if (index < 0)
        {
            return null;
        }

        const [ taken ] = this.queue.splice(index, 1);

        return taken ?? null;
    }

    snapshot (): DeploymentSnapshot
    {
        const placedCount = this.totalCount - this.queue.length;

        return {
            active: this.active,
            nextTowerId: this.peekNext(),
            placedCount,
            totalCount: this.totalCount,
            queue: [ ...this.queue ],
        };
    }
}
