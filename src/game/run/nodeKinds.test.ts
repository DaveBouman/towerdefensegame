import { describe, expect, it } from 'vitest';
import { NODE_KIND_WEIGHTS } from './nodeKinds';

describe('nodeKinds', () =>
{
    it('weights middle columns at 70% enemy, 20% event, 10% shop', () =>
    {
        const weights = new Map(NODE_KIND_WEIGHTS);
        const total = NODE_KIND_WEIGHTS.reduce((sum, [ , weight ]) => sum + weight, 0);

        expect(weights.get('enemy')).toBe(7);
        expect(weights.get('event')).toBe(2);
        expect(weights.get('shop')).toBe(1);
        expect(total).toBe(10);
    });
});
