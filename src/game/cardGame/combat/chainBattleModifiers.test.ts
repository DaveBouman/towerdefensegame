import { describe, expect, it } from 'vitest';
import { createCardInstance } from '../domain/createCardInstance';
import type { ActivationStep } from '../domain/types';
import { collectBattleModifierApplications } from './chainBattleModifiers';

const step = (
    definitionId: string,
    behaviorId: string,
): ActivationStep => ({
    slot: { row: 0, col: 0 },
    card: createCardInstance(definitionId, 'right', 'player'),
    definitionId,
    behaviorId,
    visualId: definitionId,
    arrow: 'right',
    exitArrow: 'right',
    damage: 0,
    armor: 0,
});

describe('collectBattleModifierApplications', () =>
{
    it('includes patch once when only patch activates', () =>
    {
        expect(collectBattleModifierApplications([
            step('patch', 'battle-mod'),
        ])).toEqual([ 'patch' ]);
    });

    it('stacks patch twice when echo replays patch', () =>
    {
        expect(collectBattleModifierApplications([
            step('patch', 'battle-mod'),
            step('echo', 'echo'),
        ])).toEqual([ 'patch', 'patch' ]);
    });

    it('does not duplicate glitch when echo follows a non-mod card', () =>
    {
        expect(collectBattleModifierApplications([
            step('attack', 'attack'),
            step('echo', 'echo'),
        ])).toEqual([]);
    });
});
