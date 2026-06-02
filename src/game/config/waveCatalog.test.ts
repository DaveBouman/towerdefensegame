import { describe, expect, it } from 'vitest';
import { getWaveDefinition, hasWaveDefinition, WAVE_COUNT } from './waveCatalog';

describe('waveCatalog', () =>
{
    it('loads 10 waves from waves.json', () =>
    {
        expect(WAVE_COUNT).toBe(10);
        expect(hasWaveDefinition(1)).toBe(true);
        expect(hasWaveDefinition(10)).toBe(true);
        expect(hasWaveDefinition(11)).toBe(false);
    });

    it('wave 1 defines multiple spawns on unique tiles', () =>
    {
        const spawns = getWaveDefinition(1).spawns;
        const tileKeys = spawns.map((s) => `${s.tile.col},${s.tile.row}`);

        expect(spawns).toHaveLength(5);
        expect(new Set(tileKeys).size).toBe(tileKeys.length);
    });

    it('throws when a wave is missing from waves.json', () =>
    {
        expect(() => getWaveDefinition(99)).toThrow(/waves\.json/);
    });
});
