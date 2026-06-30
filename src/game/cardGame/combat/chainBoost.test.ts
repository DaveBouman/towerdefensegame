import { describe, expect, it } from 'vitest';
import type { ActivationStep } from '../domain/types';
import { hasBoostBeforeStep, stepConsumesBoost } from './chainBoost';

const step = (behaviorId: string): ActivationStep =>
    ({
        behaviorId,
        slot: { row: 0, col: 0 },
        card: { instanceId: behaviorId, definitionId: behaviorId, arrow: 'right' },
        definitionId: behaviorId,
        visualId: behaviorId,
        arrow: 'right',
        exitArrow: 'right',
        damage: behaviorId === 'attack' || behaviorId === 'fire' ? 5 : 0,
        armor: behaviorId === 'defend' ? 3 : 0,
    });

describe('chainBoost', () =>
{
    it('buffs only the next consuming card after a field boost', () =>
    {
        const chain = [
            step('boost'),
            step('fire'),
            step('attack'),
        ];

        expect(hasBoostBeforeStep(chain, 1)).toBe(true);
        expect(hasBoostBeforeStep(chain, 2)).toBe(false);
    });

    it('lets jokers pass a boost through to the next attack', () =>
    {
        const chain = [
            step('boost'),
            step('joker'),
            step('attack'),
        ];

        expect(stepConsumesBoost(step('joker'))).toBe(false);
        expect(hasBoostBeforeStep(chain, 2)).toBe(true);
    });

    it('does not buff cards after an attack has consumed the boost', () =>
    {
        const chain = [
            step('boost'),
            step('attack'),
            step('fire'),
        ];

        expect(hasBoostBeforeStep(chain, 1)).toBe(true);
        expect(hasBoostBeforeStep(chain, 2)).toBe(false);
    });
});
