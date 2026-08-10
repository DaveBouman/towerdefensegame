import { describe, expect, it } from 'vitest';
import { collectRunModifierBattleModifiers } from './runModifiers';

describe('collectRunModifierBattleModifiers', () =>
{
    it('returns no presets when no run modifiers are active', () =>
    {
        expect(collectRunModifierBattleModifiers([])).toEqual([]);
    });
});
