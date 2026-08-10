import { describe, expect, it } from 'vitest';
import { getRestHealAmount, REST_HEAL_FRACTION } from './restSite';

describe('restSite', () =>
{
    it('restores a fraction of max integrity', () =>
    {
        expect(REST_HEAL_FRACTION).toBe(0.3);
        expect(getRestHealAmount(80)).toBe(24);
        expect(getRestHealAmount(10)).toBe(3);
    });
});
