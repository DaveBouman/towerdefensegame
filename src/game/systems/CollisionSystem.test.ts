import { describe, expect, it } from 'vitest';
import { WORLD_LAYOUT } from '../config/worldLayout';
import { CollisionSystem } from './CollisionSystem';

describe('CollisionSystem', () =>
{
    const arena = WORLD_LAYOUT.arenaPixelSize();

    it('tryMove rejects positions that overlap another body', () =>
    {
        const collision = new CollisionSystem(arena);

        expect(collision.register('a', 'enemy', { x: 200, y: 200 }, 16, 16)).toBe(true);
        expect(collision.register('b', 'enemy', { x: 400, y: 400 }, 16, 16)).toBe(true);
        expect(collision.tryMove('b', { x: 200, y: 200 })).toBe(false);
        expect(collision.getCenter('b')).toEqual({ x: 400, y: 400 });
    });

    it('setPositionFromPath allows overlaps (path authority for towers only)', () =>
    {
        const collision = new CollisionSystem(arena);

        collision.register('a', 'tower', { x: 200, y: 200 }, 24, 24);
        collision.register('b', 'tower', { x: 400, y: 400 }, 24, 24);
        expect(collision.setPositionFromPath('b', { x: 200, y: 200 })).toBe(true);
    });
});
