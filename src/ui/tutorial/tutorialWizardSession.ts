import type { TutorialWizardStep } from '../../game/run/tutorialWizard';

/** Survives coach overlay remounts (e.g. pause menu) within the same puzzle session. */
let persistedStep: TutorialWizardStep | null = null;

export const readPersistedTutorialWizardStep = (): TutorialWizardStep | null => persistedStep;

export const writePersistedTutorialWizardStep = (step: TutorialWizardStep | null): void =>
{
    persistedStep = step;
};

export const clearPersistedTutorialWizardStep = (): void =>
{
    persistedStep = null;
};
