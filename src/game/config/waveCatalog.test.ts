import { describe, expect, it } from 'vitest';
import { getWaveDefinition, hasWaveDefinition, WAVE_COUNT } from './waveCatalog';

describe('waveCatalog', () =>
{
    it('loads 3 waves from waves.json', () =>
    {
        expect(WAVE_COUNT).toBe(3);
        expect(hasWaveDefinition(1)).toBe(true);
        expect(hasWaveDefinition(3)).toBe(true);
        expect(hasWaveDefinition(4)).toBe(false);
    });

    it('wave 1 defines spawns on the top row', () =>
    {
        const spawns = getWaveDefinition(1).spawns;

        expect(spawns.length).toBeGreaterThan(0);
        expect(spawns.every((spawn) => spawn.tile.row === 0)).toBe(true);
    });

    it('throws when a wave is missing from waves.json', () =>
    {
        expect(() => getWaveDefinition(99)).toThrow(/waves\.json/);
    });
});
