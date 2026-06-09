import { describe, expect, it } from 'vitest';
import { WORLD_LAYOUT } from '../config/worldLayout';
import { CollisionSystem } from '../systems/CollisionSystem';
import { tryMoveWithAvoidance } from './tryMoveWithAvoidance';

describe('tryMoveWithAvoidance', () =>
{
    const arena = WORLD_LAYOUT.arenaPixelSize();

    it('sidesteps when the preferred tile is blocked by another enemy', () =>
    {
        const collision = new CollisionSystem(arena);

        collision.register('blocker', 'enemy', { x: 300, y: 300 }, 16, 16);
        collision.register('mover', 'enemy', { x: 200, y: 300 }, 16, 16);

        const moved = tryMoveWithAvoidance(
            collision,
            'mover',
            { x: 200, y: 300 },
            { x: 300, y: 300 },
            12,
        );

        expect(moved).not.toBeNull();
        expect(moved).not.toEqual({ x: 200, y: 300 });
        expect(collision.getCenter('mover')).toEqual(moved);
    });
});
