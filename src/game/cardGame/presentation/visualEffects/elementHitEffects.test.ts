import { describe, expect, it } from 'vitest';
import { getElementHitColor, resolveElementHitKind } from './elementHitEffects';

describe('elementHitEffects', () =>
{
    it('resolves element kind from behavior and ability', () =>
    {
        expect(resolveElementHitKind({ behaviorId: 'fire', visualId: 'fire' })).toBe('fire');
        expect(resolveElementHitKind({ behaviorId: 'poison', visualId: 'miasma' })).toBe('poison');
        expect(resolveElementHitKind({ abilityId: 'bleed' })).toBe('bleed');
        expect(resolveElementHitKind({ abilityId: 'overload', visualId: 'fire' })).toBe('overload');
        expect(resolveElementHitKind({ abilityId: 'fire-alternation' })).toBe('fire');
    });

    it('maps bleed cards through definition abilities', () =>
    {
        expect(resolveElementHitKind({
            behaviorId: 'attack',
            visualId: 'attack',
            definitionId: 'rupture',
        })).toBe('bleed');
        expect(resolveElementHitKind({
            behaviorId: 'attack',
            visualId: 'lacerate',
            definitionId: 'lacerate',
        })).toBe('bleed');
    });

    it('falls back to attack for plain strikes', () =>
    {
        expect(resolveElementHitKind({ behaviorId: 'attack', visualId: 'attack' })).toBe('attack');
        expect(getElementHitColor({ behaviorId: 'attack' })).toBe(0xff7675);
    });
});
