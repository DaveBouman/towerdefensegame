import { describe, expect, it } from 'vitest';
import type { ActivationStep } from '../domain/types';
import {
    getBoostMultiplierForStep,
    hasBoostBeforeStep,
    stepConsumesBoost,
} from './chainBoost';

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
        expect(getBoostMultiplierForStep(chain, 1)).toBe(2);
        expect(hasBoostBeforeStep(chain, 2)).toBe(false);
        expect(getBoostMultiplierForStep(chain, 2)).toBe(1);
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
        expect(getBoostMultiplierForStep(chain, 2)).toBe(2);
    });

    it('stacks boost into boost multiplicatively', () =>
    {
        const chain = [
            step('boost'),
            step('boost'),
            step('attack'),
        ];

        expect(getBoostMultiplierForStep(chain, 2)).toBe(4);
        expect(hasBoostBeforeStep(chain, 1)).toBe(true);
        expect(getBoostMultiplierForStep(chain, 1)).toBe(2);
    });

    it('stacks three boosts through a joker', () =>
    {
        const chain = [
            step('boost'),
            step('boost'),
            step('joker'),
            step('boost'),
            step('attack'),
        ];

        expect(getBoostMultiplierForStep(chain, 4)).toBe(8);
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
