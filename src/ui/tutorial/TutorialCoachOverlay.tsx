import { useLayoutEffect, useRef, useState } from 'react';
import type { TutorialWizardStep } from '../../game/run/tutorialWizard';
import { TUTORIAL_WIZARD_RING_ONLY_STEPS } from '../../game/run/tutorialWizard';
import type { useTutorialWizard } from './useTutorialWizard';
import { useTutorialWizardTargets } from './useTutorialWizardTargets';
import { TutorialSpotlightCutout } from './TutorialSpotlightCutout';
import { TutorialTargetRing } from './TutorialTargetRing';
import { pickBubblePosition } from './tutorialCoachLayout';

type TutorialWizardState = ReturnType<typeof useTutorialWizard>;

interface TutorialCoachOverlayProps {
    wizard: TutorialWizardState;
    paused?: boolean;
}

export const TutorialCoachOverlay = ({ wizard, paused = false }: TutorialCoachOverlayProps) =>
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
        dismissEnergyIntro,
        energyIntroDismissed,
        finishTutorial,
    } = wizard;
    const {
        targetId,
        targetRect,
        targetLabel,
        secondaryHighlight,
        secondaryRect,
        handDragging,
        hostSize,
    } = useTutorialWizardTargets(step, !paused);
    const bubbleRef = useRef<HTMLDivElement>(null);
    const [ bubblePos, setBubblePos ] = useState({ left: 0, top: 0 });

    useLayoutEffect(() =>
    {
        if (paused || !step || !copy || !bubbleRef.current)
        {
            setBubblePos({ left: 0, top: 0 });
            return;
        }

        const nextPos = pickBubblePosition(
            targetRect,
            bubbleRef.current.offsetWidth,
            bubbleRef.current.offsetHeight,
            hostSize,
        );

        setBubblePos(nextPos);
    }, [ paused, step, copy, targetRect, targetId, targetLabel, handDragging, hostSize, energy, maxEnergy ]);

    if (paused || !step || !copy)
    {
        return null;
    }

    if (step === 'energy' && energyIntroDismissed)
    {
        return null;
    }

    const showEnergy = step === 'strike' || step === 'energy' || step === 'fire-synergy';
    const needsAction = step === 'welcome'
        || step === 'round-reset'
        || step === 'complete'
        || step === 'energy';
    const ringOnly = TUTORIAL_WIZARD_RING_ONLY_STEPS.has(step);
    const spotlight = !ringOnly && targetRect && targetId !== 'none' ? targetRect : null;

    const onPrimary = (): void =>
    {
        if (step === 'welcome')
        {
            dismissWelcome();
            return;
        }

        if (step === 'energy')
        {
            dismissEnergyIntro();
            return;
        }

        if (step === 'round-reset')
        {
            dismissRoundReset();
            return;
        }

        if (step === 'complete')
        {
            finishTutorial();
        }
    };

    return (
        <div className="tutorial-coach-overlay" aria-live="polite">
            {!ringOnly && !spotlight && <div className="tutorial-coach-overlay__dim" aria-hidden="true" />}
            {!ringOnly && spotlight && (
                <TutorialSpotlightCutout rect={spotlight} hostSize={hostSize} label={targetLabel} />
            )}
            {ringOnly && targetRect && targetId !== 'none' && (
                <TutorialTargetRing rect={targetRect} label={targetLabel} />
            )}
            {ringOnly && secondaryRect && secondaryHighlight && (
                <TutorialTargetRing
                    rect={secondaryRect}
                    label={secondaryHighlight.label}
                    secondary
                />
            )}
            <div
                ref={bubbleRef}
                className="tutorial-coach-overlay__bubble"
                style={{ left: bubblePos.left, top: bubblePos.top }}
            >
                <div className="tutorial-coach-overlay__progress" aria-hidden="true">
                    {Array.from({ length: stepCount }, (_, index) => (
                        <span
                            key={index}
                            className={[
                                'tutorial-coach-overlay__dot',
                                index <= stepIndex ? 'tutorial-coach-overlay__dot--active' : '',
                                index === stepIndex ? 'tutorial-coach-overlay__dot--current' : '',
                            ].filter(Boolean).join(' ')}
                        />
                    ))}
                </div>
                <p className="tutorial-coach-overlay__eyebrow">
                    Training sim, step {stepIndex + 1} of {stepCount}
                </p>
                <h2 className="tutorial-coach-overlay__title">{copy.title}</h2>
                <p className="tutorial-coach-overlay__body">{copy.body}</p>
                {showEnergy && maxEnergy !== null && energy !== null && (
                    <p className="tutorial-coach-overlay__energy">
                        Energy <strong>{energy}</strong> / {maxEnergy}
                    </p>
                )}
                {copy.hint && !needsAction && (
                    <p className="tutorial-coach-overlay__hint">{copy.hint}</p>
                )}
                {needsAction && copy.action && (
                    <button
                        type="button"
                        className="tutorial-coach-overlay__button"
                        onClick={onPrimary}
                    >
                        {copy.action}
                    </button>
                )}
                {!needsAction && (
                    <p className="tutorial-coach-overlay__hint tutorial-coach-overlay__hint--next">
                        {targetId === 'none'
                            ? 'Follow the step above.'
                            : step === 'place-attacks' && !handDragging
                                ? 'Drag an Attack card from the highlighted hand.'
                                : step === 'place-attacks' && handDragging
                                    ? 'Drop the card on the highlighted row.'
                                : step === 'move-chain-start'
                                    ? 'Click the highlighted row in column 0.'
                                    : step === 'strike' || step === 'fire-synergy'
                                        ? 'Press Attack when ready.'
                                        : 'Click the yellow ring.'}
                    </p>
                )}
            </div>
        </div>
    );
};

export type { TutorialWizardStep };
