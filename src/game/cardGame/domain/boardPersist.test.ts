import { describe, expect, it } from 'vitest';
import {
    clearLatchSlots,
    getLatchKeepInstanceIds,
    getLatchKind,
    noteLatchPlacement,
    noteLatchRemoval,
    type LatchSlots,
} from './boardPersist';

describe('getLatchKind', () =>
{
    it('classifies attacks, defends, and skills', () =>
    {
        expect(getLatchKind('attack')).toBe('attack');
        expect(getLatchKind('defend')).toBe('defend');
        expect(getLatchKind('fire')).toBe('skill');
        expect(getLatchKind('poison')).toBe('skill');
        expect(getLatchKind('joker')).toBe('skill');
        expect(getLatchKind('echo')).toBe('skill');
    });

    it('ignores field nodes and curses', () =>
    {
        expect(getLatchKind('hazard')).toBeNull();
        expect(getLatchKind('siphon')).toBeNull();
        expect(getLatchKind('boost')).toBeNull();
        expect(getLatchKind('curse')).toBeNull();
        expect(getLatchKind('fuse')).toBeNull();
    });

    it('pins only the first card of each kind and forgets picked-up pins', () =>
    {
        const slots: LatchSlots = {};

        noteLatchPlacement(slots, 'attack', 'atk-1');
        noteLatchPlacement(slots, 'attack', 'atk-2');
        noteLatchPlacement(slots, 'defend', 'def-1');
        noteLatchPlacement(slots, 'fire', 'skill-1');
        noteLatchPlacement(slots, 'poison', 'skill-2');

        expect([ ...getLatchKeepInstanceIds(slots) ].sort()).toEqual([ 'atk-1', 'def-1', 'skill-1' ]);

        noteLatchRemoval(slots, 'atk-1');
        noteLatchPlacement(slots, 'attack', 'atk-3');

        expect(getLatchKeepInstanceIds(slots).has('atk-3')).toBe(true);
        expect(getLatchKeepInstanceIds(slots).has('atk-1')).toBe(false);

        clearLatchSlots(slots);
        expect(getLatchKeepInstanceIds(slots).size).toBe(0);
    });
});
