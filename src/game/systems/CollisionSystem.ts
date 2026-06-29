import { boxFromCenter, boxesOverlap } from '../collision/aabb';
import type { OccupantKind } from '../collision/types';
import type { GridPixelSize } from '../grid/types';
import type { WorldPosition } from '../grid/types';

interface BodyEntry {
    kind: OccupantKind;
    center: WorldPosition;
    halfWidth: number;
    halfHeight: number;
}

export interface MoveOptions {
    ignoreKinds?: ReadonlySet<OccupantKind>;
}

export class CollisionSystem
{
    private readonly bodies = new Map<string, BodyEntry>();

    constructor (private readonly arenaSize: GridPixelSize) {}

    register (
        id: string,
        kind: OccupantKind,
        center: WorldPosition,
        halfWidth: number,
        halfHeight: number,
    ): boolean
    {
        if (!this.fitsInArena(center, halfWidth, halfHeight)
            || this.overlapsOthers(id, center, halfWidth, halfHeight))
        {
            return false;
        }

        this.bodies.set(id, {
            kind,
            center: { ...center },
            halfWidth,
            halfHeight,
        });

        return true;
    }

    unregister (id: string): void
    {
        this.bodies.delete(id);
    }

    canMove (id: string, center: WorldPosition, options: MoveOptions = {}): boolean
    {
        const entry = this.bodies.get(id);

        if (!entry)
        {
            return false;
        }

        return this.fitsInArena(center, entry.halfWidth, entry.halfHeight)
            && !this.overlapsOthers(
                id,
                center,
                entry.halfWidth,
                entry.halfHeight,
                options.ignoreKinds,
            );
    }

    tryMove (id: string, center: WorldPosition, options: MoveOptions = {}): boolean
    {
        if (!this.canMove(id, center, options))
        {
            return false;
        }

        const entry = this.bodies.get(id)!;

        entry.center = { ...center };

        return true;
    }

    /** Updates position after A* path step — grid path is the blocking authority. */
    setPositionFromPath (id: string, center: WorldPosition): boolean
    {
        const entry = this.bodies.get(id);

        if (!entry)
        {
            return false;
        }

        if (!this.fitsInArena(center, entry.halfWidth, entry.halfHeight))
        {
            return false;
        }

        entry.center = { ...center };

        return true;
    }

    getCenter (id: string): WorldPosition | undefined
    {
        const entry = this.bodies.get(id);

        return entry ? { ...entry.center } : undefined;
    }

    getBodyIds (): string[]
    {
        return [ ...this.bodies.keys() ];
    }

    forEachBody (
        excludeId: string,
        visit: (
            center: WorldPosition,
            halfWidth: number,
            halfHeight: number,
            kind: OccupantKind,
        ) => void,
    ): void
    {
        for (const [ id, entry ] of this.bodies)
        {
            if (id === excludeId)
            {
                continue;
            }

            visit(entry.center, entry.halfWidth, entry.halfHeight, entry.kind);
        }
    }

    clear (): void
    {
        this.bodies.clear();
    }

    private fitsInArena (
        center: WorldPosition,
        halfWidth: number,
        halfHeight: number,
    ): boolean
    {
        const box = boxFromCenter(center, halfWidth, halfHeight);

        return box.left >= 0
            && box.top >= 0
            && box.right <= this.arenaSize.width
            && box.bottom <= this.arenaSize.height;
    }

    private overlapsOthers (
        id: string,
        center: WorldPosition,
        halfWidth: number,
        halfHeight: number,
        ignoreKinds?: ReadonlySet<OccupantKind>,
    ): boolean
    {
        const self = this.bodies.get(id);

        if (!self)
        {
            return false;
        }

        const candidate = boxFromCenter(center, halfWidth, halfHeight);

        for (const [ otherId, other ] of this.bodies)
        {
            if (otherId === id)
            {
                continue;
            }

            if (ignoreKinds?.has(other.kind))
            {
                continue;
            }

            const otherBox = boxFromCenter(other.center, other.halfWidth, other.halfHeight);

            if (boxesOverlap(candidate, otherBox))
            {
                return true;
            }
        }

        return false;
    }
}
