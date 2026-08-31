import type { CardDirection } from '../cardGame/domain/cardDirections';
import { GAME_RULES } from '../cardGame/config/cardRegistry';
import type { TutorialWizardStep } from './tutorialWizard';

export interface TutorialWizardCardSpec {
    definitionId: string;
    arrow?: CardDirection;
}

export interface TutorialWizardBoardSpec {
    row: number;
    col: number;
    definitionId: string;
    arrow?: CardDirection;
}

export interface TutorialWizardPhaseSpec {
    stepId: TutorialWizardStep;
    handCards: readonly TutorialWizardCardSpec[];
    boardCards?: readonly TutorialWizardBoardSpec[];
    chainStart?: { row: number; col: number };
    maxEnergy: number;
    preserveBoard?: boolean;
}

export const TUTORIAL_WIZARD_PHASE_SPECS: Partial<Record<TutorialWizardStep, TutorialWizardPhaseSpec>> = {
    'chain-start': {
        stepId: 'chain-start',
        handCards: [],
        chainStart: { row: 2, col: 0 },
        maxEnergy: 0,
    },
    'place-attacks': {
        stepId: 'place-attacks',
        handCards: [
            { definitionId: 'attack', arrow: 'right' },
            { definitionId: 'attack', arrow: 'right' },
            { definitionId: 'attack', arrow: 'right' },
        ],
        chainStart: { row: 0, col: 0 },
        maxEnergy: 0,
    },
    'strike': {
        stepId: 'strike',
        handCards: [],
        maxEnergy: 1,
        preserveBoard: true,
    },
    'energy': {
        stepId: 'energy',
        handCards: [
            { definitionId: 'attack', arrow: 'right' },
            { definitionId: 'attack', arrow: 'right' },
            { definitionId: 'attack', arrow: 'right' },
        ],
        chainStart: { row: 0, col: 0 },
        maxEnergy: GAME_RULES.energyPerTurn,
    },
    'fire-synergy': {
        stepId: 'fire-synergy',
        handCards: [
            { definitionId: 'fire', arrow: 'right' },
            { definitionId: 'attack', arrow: 'right' },
            { definitionId: 'defend', arrow: 'right' },
            { definitionId: 'attack', arrow: 'right' },
        ],
        chainStart: { row: 0, col: 0 },
        maxEnergy: 1,
    },
};

export const getTutorialWizardPhaseSpec = (stepId: TutorialWizardStep): TutorialWizardPhaseSpec | null =>
    TUTORIAL_WIZARD_PHASE_SPECS[stepId] ?? null;
