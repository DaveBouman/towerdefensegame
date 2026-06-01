import { describe, expect, it } from 'vitest';
import { TOWER_DEFINITIONS } from './towerCatalog';
import { rollTowerDraftChoices, tierWeightForWave } from './towerDraft';

describe('towerDraft', () =>
{
    it('favors low tiers at wave 0 and high tiers at later waves', () =>
    {
        expect(tierWeightForWave(1, 0)).toBeGreaterThan(tierWeightForWave(5, 0));
        expect(tierWeightForWave(5, 8)).toBeGreaterThan(tierWeightForWave(1, 8));
    });

    it('returns five unique tower ids', () =>
    {
        const choices = rollTowerDraftChoices(0, 5);

        expect(choices).toHaveLength(5);
        expect(new Set(choices).size).toBe(5);
        expect(choices.every((id) => TOWER_DEFINITIONS.some((d) => d.id === id))).toBe(true);
    });
});
