import { describe, expect, it } from 'vitest';
import {
    assignLoopStarterArrows,
    LOOP_STARTER_ARROWS,
    rollStationCardOffers,
} from './loopRun';

describe('loopRun starters and station cards', () =>
{
    it('assigns only right and down arrows to starter kit cards', () =>
    {
        const kit = assignLoopStarterArrows([
            { definitionId: 'attack' },
            { definitionId: 'defend' },
            { definitionId: 'boost' },
            { definitionId: 'fire', arrow: 'left' },
        ]);

        expect(kit[0]?.arrow).toBe('right');
        expect(kit[1]?.arrow).toBe('down');
        expect(kit[2]?.arrow).toBe('right');
        expect(kit[3]?.arrow).toBe('left');
        expect(kit.every((card) =>
            card.arrow === 'left'
            || LOOP_STARTER_ARROWS.includes(card.arrow!),
        )).toBe(true);
    });

    it('rolls three station card offers without a pre-set arrow', () =>
    {
        const offers = rollStationCardOffers(3);

        expect(offers).toHaveLength(3);
        expect(new Set(offers.map((offer) => offer.definitionId)).size).toBeGreaterThan(0);
        expect(offers.every((offer) => offer.arrow === undefined)).toBe(true);
    });
});
