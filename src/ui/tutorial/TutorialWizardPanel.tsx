import type { TutorialWizardStep } from '../../game/run/tutorialWizard';
import { useTutorialWizard } from './useTutorialWizard';

interface TutorialWizardPanelProps {
    active: boolean;
}

export const TutorialWizardPanel = ({ active }: TutorialWizardPanelProps) =>
{
    const {
        step,
        copy,
        stepIndex,
        stepCount,
        energy,
        maxEnergy,
        dismissWelcome,
        dismissRoundReset,
        finishTutorial,
    } = useTutorialWizard(active);

    if (!active || !step || !copy)
    {
        return null;
    }

    const showEnergy = step === 'strike' || step === 'energy' || step === 'fire-synergy';
    const needsAction = step === 'welcome' || step === 'round-reset' || step === 'complete';

    return (
        <aside className="tutorial-wizard tutorial-wizard--expanded" aria-live="polite">
            <div className="tutorial-wizard__progress" aria-hidden="true">
                {Array.from({ length: stepCount }, (_, index) => (
                    <span
                        key={index}
                        className={[
                            'tutorial-wizard__dot',
                            index <= stepIndex ? 'tutorial-wizard__dot--active' : '',
                            index === stepIndex ? 'tutorial-wizard__dot--current' : '',
                        ].filter(Boolean).join(' ')}
                    />
                ))}
            </div>
            <p className="tutorial-wizard__eyebrow">Training sim, step {stepIndex + 1} of {stepCount}</p>
            <h2 className="tutorial-wizard__title">{copy.title}</h2>
            <p className="tutorial-wizard__body">{copy.body}</p>
            {showEnergy && maxEnergy !== null && energy !== null && (
                <p className="tutorial-wizard__energy">
                    Energy <strong>{energy}</strong> / {maxEnergy}
                </p>
            )}
            {copy.hint && !needsAction && (
                <p className="tutorial-wizard__hint">{copy.hint}</p>
            )}
            {step === 'welcome' && copy.action && (
                <button
                    type="button"
                    className="tutorial-wizard__button"
                    onClick={dismissWelcome}
                >
                    {copy.action}
                </button>
            )}
            {step === 'round-reset' && copy.action && (
                <button
                    type="button"
                    className="tutorial-wizard__button"
                    onClick={dismissRoundReset}
                >
                    {copy.action}
                </button>
            )}
            {step === 'complete' && copy.action && (
                <button
                    type="button"
                    className="tutorial-wizard__button"
                    onClick={finishTutorial}
                >
                    {copy.action}
                </button>
            )}
            {!needsAction && step !== 'complete' && !copy.hint && (
                <p className="tutorial-wizard__hint">Follow the step above. The sim waits for you.</p>
            )}
        </aside>
    );
};

export type { TutorialWizardStep };
