import { describe, expect, it } from 'vitest';
import { computeCorditePayloadBonus, countCorditeBeforePayload } from './corditePayload';
import type { ActivationStep } from '../domain/types';

const step = (
    definitionId: string,
    behaviorId: string,
    order: number,
): ActivationStep =>
    ({
        definitionId,
        behaviorId,
        slot: { row: 0, col: order },
        damage: behaviorId === 'warhead' || behaviorId === 'fire' ? 5 : 0,
        order,
    }) as ActivationStep;

describe('cordite payload', () =>
{
    it('counts Charge cards immediately before Blast', () =>
    {
        const chain = [
            step('fire', 'fire', 0),
            step('cordite', 'cordite', 1),
            step('cordite', 'cordite', 2),
            step('cordite', 'cordite', 3),
            step('warhead', 'warhead', 4),
        ];

        expect(countCorditeBeforePayload(chain, 4)).toBe(3);
        expect(computeCorditePayloadBonus(3, 4)).toBe(12);
    });

    it('works without Fire — only Charge → Blast', () =>
    {
        const chain = [
            step('cordite', 'cordite', 0),
            step('cordite', 'cordite', 1),
            step('warhead', 'warhead', 2),
        ];

        expect(countCorditeBeforePayload(chain, 2)).toBe(2);
    });

    it('breaks when a non-Charge card interrupts', () =>
    {
        const chain = [
            step('cordite', 'cordite', 0),
            step('attack', 'attack', 1),
            step('cordite', 'cordite', 2),
            step('warhead', 'warhead', 3),
        ];

        expect(countCorditeBeforePayload(chain, 3)).toBe(1);
    });

    it('returns zero with no Charge trail', () =>
    {
        const chain = [
            step('fire', 'fire', 0),
            step('warhead', 'warhead', 1),
        ];

        expect(countCorditeBeforePayload(chain, 1)).toBe(0);
        expect(computeCorditePayloadBonus(0, 4)).toBe(0);
    });
});
