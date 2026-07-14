import { describe, expect, it } from 'vitest';
import { createCardInstance } from '../domain/createCardInstance';
import type { ActivationStep } from '../domain/types';
import { getEchoReplayTarget } from './echoReplay';

const step = (
    definitionId: string,
    behaviorId: string,
    damage = 0,
    armor = 0,
): ActivationStep => ({
    slot: { row: 0, col: 0 },
    card: createCardInstance(definitionId, 'right', 'player'),
    definitionId,
    behaviorId,
    visualId: definitionId,
    arrow: 'right',
    exitArrow: 'right',
    damage,
    armor,
});

describe('echoReplay', () =>
{
    it('returns the previous step when an echo card activates', () =>
    {
        const chain = [
            step('attack', 'attack', 3),
            step('echo', 'echo'),
        ];

        const replay = getEchoReplayTarget(chain, 1);

        expect(replay?.step.definitionId).toBe('attack');
        expect(replay?.resolved.damage).toBe(3);
    });

    it('returns null for the first chain step', () =>
    {
        expect(getEchoReplayTarget([ step('echo', 'echo') ], 0)).toBeNull();
    });
});
