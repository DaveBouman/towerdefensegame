import { describe, expect, it } from 'vitest';
import { getCardVisualEffectOrThrow } from './visualEffectRegistry';

describe('visualEffectRegistry', () =>
{
    it('resolves all card visual ids used in cards.json', () =>
    {
        const visualIds = [
            'attack',
            'defend',
            'joker',
            'loop-reset',
            'poison',
            'fire',
            'hazard',
            'boost',
            'curse',
            'fuse',
            'courier',
            'shiv',
            'miasma',
            'cinder',
            'lacerate',
            'scorch',
            'bramble',
            'glitch',
            'hardwire',
            'patch',
            'overclock',
            'echo',
            'salvage',
        ];

        for (const id of visualIds)
        {
            expect(getCardVisualEffectOrThrow(id).id).toBe(id);
        }
    });
});
