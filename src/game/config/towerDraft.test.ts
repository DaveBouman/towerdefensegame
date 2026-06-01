import { describe, expect, it } from 'vitest';
import { getTowerDefinition, TOWER_DEFINITIONS } from './towerCatalog';
import {
    definitionsEligibleForDraft,
    rollTowerDraftChoices,
    tierWeightForWave,
} from './towerDraft';

describe('towerDraft', () =>
{
    it('favors low tiers at wave 0 and high tiers at later waves', () =>
    {
        expect(tierWeightForWave(1, 0)).toBeGreaterThan(tierWeightForWave(5, 0));
        expect(tierWeightForWave(5, 8)).toBeGreaterThan(tierWeightForWave(1, 8));
    });

    it('at wave 0 only offers tier 1 towers', () =>
    {
        const eligible = definitionsEligibleForDraft(0);

        expect(eligible.every((d) => d.tier === 1)).toBe(true);
        expect(eligible).toHaveLength(2);

        const choices = rollTowerDraftChoices(0, 5);

        expect(choices).toHaveLength(2);
        expect(choices.every((id) => getTowerDefinition(id)?.tier === 1)).toBe(true);
        expect(new Set(choices).size).toBe(2);
    });

    it('returns up to five unique tower ids on later waves', () =>
    {
        const choices = rollTowerDraftChoices(5, 5);

        expect(choices).toHaveLength(5);
        expect(new Set(choices).size).toBe(5);
        expect(choices.every((id) => TOWER_DEFINITIONS.some((d) => d.id === id))).toBe(true);
    });
});
