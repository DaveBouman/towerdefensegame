import { describe, expect, it } from 'vitest';
import { sanitizeBattleLog } from './protocol';

describe('sanitizeBattleLog', () =>
{
    it('strips battle seeds from start events', () =>
    {
        const log = sanitizeBattleLog([
            { type: 'start', seed: 'SECRET' },
            { type: 'end', winner: 'a' },
        ]);

        expect(log[0]).toEqual({ type: 'start', seed: '' });
        expect(log[1]).toEqual({ type: 'end', winner: 'a' });
    });
});
