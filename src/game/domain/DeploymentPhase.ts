import type { TowerArchetype } from './towers/types';
import type { DeploymentSnapshot } from './types';
import { STARTING_DEPLOYMENT_QUEUE } from '../config/deploymentConfig';

export class DeploymentPhase
{
    private queue: TowerArchetype[] = [];
    private readonly startingQueue: readonly TowerArchetype[];
    private readonly totalCount: number;

    constructor (startingQueue: readonly TowerArchetype[] = STARTING_DEPLOYMENT_QUEUE)
    {
        this.startingQueue = startingQueue;
        this.totalCount = startingQueue.length;
    }

    begin (): void
    {
        this.queue = [ ...this.startingQueue ];
    }

    reset (): void
    {
        this.queue = [];
    }

    get active (): boolean
    {
        return this.queue.length > 0;
    }

    peekNext (): TowerArchetype | null
    {
        return this.queue[0] ?? null;
    }

    takeNext (): TowerArchetype | null
    {
        return this.queue.shift() ?? null;
    }

    snapshot (): DeploymentSnapshot
    {
        const placedCount = this.totalCount - this.queue.length;

        return {
            active: this.active,
            nextArchetype: this.peekNext(),
            placedCount,
            totalCount: this.totalCount,
        };
    }
}
