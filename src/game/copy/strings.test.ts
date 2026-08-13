import { describe, expect, it } from 'vitest';
import {
    archetypeLabel,
    bodyModLabel,
    cardLabel,
    enemyLabel,
    nodeKindLabel,
    poisonStatusName,
    poisonStatusNameLower,
    poisonStatusNameUpper,
    shopLabel,
    t,
} from './strings';

describe('copy strings', () =>
{
    it('resolves card labels from the catalog', () =>
    {
        expect(cardLabel('attack')).toBe('Attack');
        expect(cardLabel('poison')).toBe('Rad');
        expect(cardLabel('attack-plus')).toBe('Attack+');
        expect(cardLabel('unknown-card', 'Fallback')).toBe('Fallback');
    });

    it('resolves entity labels from the catalog', () =>
    {
        expect(enemyLabel('basic')).toBe('Raider');
        expect(bodyModLabel('venom-latch')).toBe('Venom Latch');
        expect(nodeKindLabel('shop')).toBe('Ripperdoc');
        expect(shopLabel('heal')).toBe('Integrity Patch');
        expect(archetypeLabel('toxin')).toBe('Toxin');
        expect(t('enemy.saboteur.phase')).toBe('Overload');
    });

    it('keeps poison status helpers on the card label', () =>
    {
        expect(poisonStatusName()).toBe(cardLabel('poison'));
        expect(poisonStatusNameLower()).toBe('rad');
        expect(poisonStatusNameUpper()).toBe('RAD');
    });
});
