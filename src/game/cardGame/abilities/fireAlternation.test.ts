import { describe, expect, it } from 'vitest';
import { computeFireAlternationBonus, countAlternatingAttackDefendAfter } from './fireAlternation';
import type { ActivationStep } from '../domain/types';

const step = (behaviorId: string): ActivationStep =>
    ({
        behaviorId,
        slot: { row: 0, col: 0 },
        card: { instanceId: 'x', definitionId: behaviorId, arrow: 'right' },
        definitionId: behaviorId,
        visualId: behaviorId,
        arrow: 'right',
        exitArrow: 'right',
        damage: 0,
        armor: 0,
    });

describe('fireAlternation', () =>
{
    it('counts zero when no attack/defend cards follow', () =>
    {
        const chain = [ step('fire'), step('joker'), step('boost') ];

        expect(countAlternatingAttackDefendAfter(chain, 0)).toBe(0);
    });

    it('counts zero when only one attack/defend card follows', () =>
    {
        const chain = [ step('fire'), step('attack') ];

        expect(countAlternatingAttackDefendAfter(chain, 0)).toBe(1);
        expect(computeFireAlternationBonus(1, 3)).toBe(0);
    });

    it('counts alternating attack/defend steps and skips neutral skills', () =>
    {
        const chain = [
            step('fire'),
            step('attack'),
            step('joker'),
            step('defend'),
            step('attack'),
            step('attack'),
        ];

        expect(countAlternatingAttackDefendAfter(chain, 0)).toBe(3);
        expect(computeFireAlternationBonus(3, 3)).toBe(6);
    });

    it('stops counting when alternation breaks', () =>
    {
        const chain = [
            step('fire'),
            step('defend'),
            step('defend'),
            step('attack'),
        ];

        expect(countAlternatingAttackDefendAfter(chain, 0)).toBe(1);
    });
});
