import { describe, expect, it } from 'vitest';
import {
    countCardsOnRow,
    hasCardAtSlot,
    nextTutorialWizardStep,
    PLACE_ATTACKS_TARGET,
    slotKey,
} from './tutorialWizardSteps';

describe('nextTutorialWizardStep', () =>
{
    it('advances from chain-start when row A is selected', () =>
    {
        expect(nextTutorialWizardStep('chain-start', {
            chainStartRow: 0,
            chainStartCol: 0,
            hasCardAtChainStart: false,
            cardsOnChainStartRow: 0,
            attackCountThisPhase: 0,
            energyRemaining: 0,
            maxEnergy: 0,
        })).toBe('place-attacks');
    });

    it('advances to strike after enough attacks are placed on the chain row', () =>
    {
        expect(nextTutorialWizardStep('place-attacks', {
            chainStartRow: 0,
            chainStartCol: 0,
            hasCardAtChainStart: true,
            cardsOnChainStartRow: PLACE_ATTACKS_TARGET,
            attackCountThisPhase: 0,
            energyRemaining: 0,
            maxEnergy: 0,
        })).toBe('strike');
    });

    it('slot helpers track placed tiles on a row', () =>
    {
        const placed = new Set([ slotKey(0, 0), slotKey(0, 1) ]);
        expect(hasCardAtSlot(placed, 0, 0)).toBe(true);
        expect(countCardsOnRow(placed, 0)).toBe(2);
        expect(countCardsOnRow(placed, 1)).toBe(0);
    });
});
