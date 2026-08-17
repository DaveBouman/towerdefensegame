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
            'siphon',
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
            'thorns',
            'glitch',
            'hardwire',
            'patch',
            'overclock',
            'echo',
            'salvage',
            'redline',
        ];

        for (const id of visualIds)
        {
            expect(getCardVisualEffectOrThrow(id).id).toBe(id);
        }
    });
});
