import { useEffect, useState } from 'react';
import { EventBus } from '../../game/EventBus';
import type { TutorialWizardLayoutPayload } from '../../game/board/tutorialViewportRects';
import {
    getGameHostSize,
    type ViewportRect,
} from '../../game/board/tutorialViewportRects';
import { GAME_EVENTS } from '../../game/events/gameEvents';
import type {
    TutorialWizardSecondaryHighlight,
    TutorialWizardStep,
    TutorialWizardTargetId,
} from '../../game/run/tutorialWizard';
import {
    getTutorialWizardSecondaryHighlight,
    getTutorialWizardTargetLabel,
    resolveTutorialWizardTarget,
} from '../../game/run/tutorialWizard';

export type { ViewportRect };

const TARGET_KEY: Partial<Record<TutorialWizardTargetId, keyof TutorialWizardLayoutPayload>> = {
    'chain-start-tile': 'chainStartTile',
    'chain-row': 'chainRow',
    hand: 'hand',
    grid: 'grid',
    'attack-button': 'attack',
    energy: 'energy',
};

const readTargetRect = (
    layout: TutorialWizardLayoutPayload | null,
    targetId: TutorialWizardTargetId,
): ViewportRect | null =>
{
    const targetKey = TARGET_KEY[targetId];
    const rawTarget = targetKey && layout ? layout[targetKey] : null;

    return rawTarget
        && typeof rawTarget === 'object'
        && 'width' in rawTarget
        && rawTarget.width > 0
        && rawTarget.height > 0
        ? rawTarget
        : null;
};

export const useTutorialWizardTargets = (
    step: TutorialWizardStep | null,
    active: boolean,
): {
    targetId: TutorialWizardTargetId;
    targetRect: ViewportRect | null;
    targetLabel: string;
    secondaryHighlight: TutorialWizardSecondaryHighlight | null;
    secondaryRect: ViewportRect | null;
    handDragging: boolean;
    hostSize: { width: number; height: number };
} =>
{
    const [ layout, setLayout ] = useState<TutorialWizardLayoutPayload | null>(null);
    const [ hostSize, setHostSize ] = useState(getGameHostSize);

    const handDragging = layout?.handDragging ?? false;
    const targetId = step ? resolveTutorialWizardTarget(step, handDragging) : 'none';
    const secondaryHighlight = step
        ? getTutorialWizardSecondaryHighlight(step, handDragging)
        : null;

    useEffect(() =>
    {
        if (!active)
        {
            setLayout(null);
            return;
        }

        const onLayout = (next: TutorialWizardLayoutPayload): void =>
        {
            setLayout(next);
            setHostSize(getGameHostSize());
        };

        const requestLayout = (): void =>
        {
            EventBus.emit(GAME_EVENTS.TUTORIAL_WIZARD_REQUEST_LAYOUT);
        };

        EventBus.on(GAME_EVENTS.TUTORIAL_WIZARD_LAYOUT, onLayout);
        requestLayout();

        const timer = window.setInterval(requestLayout, 250);

        return () =>
        {
            EventBus.off(GAME_EVENTS.TUTORIAL_WIZARD_LAYOUT, onLayout);
            window.clearInterval(timer);
        };
    }, [ active ]);

    useEffect(() =>
    {
        if (active && step)
        {
            EventBus.emit(GAME_EVENTS.TUTORIAL_WIZARD_REQUEST_LAYOUT);
        }
    }, [ active, step ]);

    const targetRect = readTargetRect(layout, targetId);
    const secondaryRect = secondaryHighlight
        ? readTargetRect(layout, secondaryHighlight.targetId)
        : null;
    const targetLabel = step ? getTutorialWizardTargetLabel(step, handDragging) : 'Click here';

    return {
        targetId,
        targetRect,
        targetLabel,
        secondaryHighlight,
        secondaryRect,
        handDragging,
        hostSize,
    };
};
