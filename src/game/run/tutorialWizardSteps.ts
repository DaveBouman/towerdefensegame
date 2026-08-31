import type { TutorialWizardStep } from './tutorialWizard';
import { TUTORIAL_WIZARD_STEP_ORDER } from './tutorialWizard';

export interface TutorialWizardSignals {
    chainStartRow: number;
    chainStartCol: number;
    hasCardAtChainStart: boolean;
    cardsOnChainStartRow: number;
    attackCountThisPhase: number;
    energyRemaining: number;
    maxEnergy: number;
}

export const PLACE_ATTACKS_TARGET = 3;
export const ENERGY_ATTACKS_TARGET = 3;

export const nextTutorialWizardStep = (
    step: TutorialWizardStep,
    signals: TutorialWizardSignals,
): TutorialWizardStep =>
{
    switch (step)
    {
        case 'welcome':
        case 'complete':
            return step;
        case 'chain-start':
            return signals.chainStartCol === 0 && signals.chainStartRow === 0
                ? 'place-attacks'
                : step;
        case 'place-attacks':
            return signals.cardsOnChainStartRow >= PLACE_ATTACKS_TARGET
                && signals.hasCardAtChainStart
                ? 'strike'
                : step;
        case 'strike':
            return signals.attackCountThisPhase >= 1 ? step : step;
        case 'energy':
        case 'move-chain-start':
            return step;
        case 'round-reset':
            return step;
        case 'fire-synergy':
            return step;
        default:
            return step;
    }
};

export const stepIndex = (step: TutorialWizardStep): number =>
    TUTORIAL_WIZARD_STEP_ORDER.indexOf(step);

export const slotKey = (row: number, col: number): string => `${row},${col}`;

export const hasCardAtSlot = (
    placedSlots: ReadonlySet<string>,
    row: number,
    col: number,
): boolean =>
    placedSlots.has(slotKey(row, col));

export const countCardsOnRow = (
    placedSlots: ReadonlySet<string>,
    row: number,
    cols = 5,
): number =>
{
    let count = 0;

    for (let col = 0; col < cols; col += 1)
    {
        if (placedSlots.has(slotKey(row, col)))
        {
            count += 1;
        }
    }

    return count;
};
