export const TUTORIAL_WIZARD_PUZZLE_ID = 'tutorial-wizard';

export type TutorialWizardStep =
    | 'welcome'
    | 'chain-start'
    | 'place-attacks'
    | 'strike'
    | 'energy'
    | 'move-chain-start'
    | 'round-reset'
    | 'fire-synergy'
    | 'complete';

/** Row the player must pick when learning mid round chain start (row C = index 2). */
export const TUTORIAL_MOVE_CHAIN_START_TARGET_ROW = 2;

export interface TutorialWizardStepCopy {
    title: string;
    body: string;
    action?: string;
    hint?: string;
}

export const TUTORIAL_WIZARD_STEP_ORDER: readonly TutorialWizardStep[] = [
    'welcome',
    'chain-start',
    'place-attacks',
    'strike',
    'energy',
    'move-chain-start',
    'round-reset',
    'fire-synergy',
    'complete',
];

export const TUTORIAL_WIZARD_STEPS: Record<TutorialWizardStep, TutorialWizardStepCopy> = {
    'welcome': {
        title: 'Training sim',
        body: 'Walk through the core loop on a safe dummy: chain start, attacks, energy, round resets, and a Fire synergy.',
        action: 'Begin training',
    },
    'chain-start': {
        title: 'Pick chain start',
        body: 'Click a tile in the left column. That row is where your chain begins when you Attack.',
        hint: 'Try the top row, row A.',
    },
    'place-attacks': {
        title: 'Build the chain',
        body: 'Drag all three Attack cards onto the same row as your chain start. Line them up left to right with arrows pointing right.',
        hint: 'Drop each card on the highlighted row.',
    },
    'strike': {
        title: 'First strike',
        body: 'Press Attack to run the chain. Each card in the path hits the dummy once.',
        hint: 'The dummy will not hit back during training.',
    },
    'energy': {
        title: 'Energy',
        body: 'You have 3 energy. Three Attacks this round. Strike again. The board stays between attacks until energy runs out.',
        action: 'Got it',
    },
    'move-chain-start': {
        title: 'Move chain start',
        body: 'You can change chain start mid round. Click row C in the left column to move your start point before the next Attack.',
        hint: 'Row C, third row down.',
    },
    'round-reset': {
        title: 'New round',
        body: 'Energy spent. The board clears and you get a fresh hand. That is one combat round. Real fights work the same way.',
        action: 'Got it',
    },
    'fire-synergy': {
        title: 'Fire rhythm',
        body: 'Fire rewards alternating Attack and Defend steps after it. Try Fire, then Attack, Defend, Attack in one row.',
        hint: 'One Attack to finish training.',
    },
    'complete': {
        title: 'Basics covered',
        body: 'That is the core loop. The run holds much more: new cards, enemy tricks, body mods, and deeper chains. Pick a route when you are ready.',
        action: 'Continue to map',
    },
};

export const isTutorialWizardPuzzle = (puzzleId: string): boolean =>
    puzzleId === TUTORIAL_WIZARD_PUZZLE_ID;

export type TutorialWizardTargetId =
    | 'none'
    | 'chain-start-tile'
    | 'chain-row'
    | 'hand'
    | 'grid'
    | 'attack-button'
    | 'energy';

export interface TutorialWizardSecondaryHighlight {
    targetId: TutorialWizardTargetId;
    label: string;
}

export const TUTORIAL_WIZARD_SECONDARY_HIGHLIGHT_BY_STEP: Partial<
    Record<TutorialWizardStep, TutorialWizardSecondaryHighlight>
> = {
    'place-attacks': {
        targetId: 'chain-row',
        label: 'Drop cards on this row',
    },
    'strike': {
        targetId: 'attack-button',
        label: 'Press Attack',
    },
    'fire-synergy': {
        targetId: 'attack-button',
        label: 'Press Attack',
    },
};

/** Steps that show rings only — gameplay stays clickable under the coach. */
export const TUTORIAL_WIZARD_RING_ONLY_STEPS: ReadonlySet<TutorialWizardStep> = new Set([
    'strike',
    'energy',
    'fire-synergy',
]);

export const getTutorialWizardSecondaryHighlight = (
    step: TutorialWizardStep,
    handDragging: boolean,
): TutorialWizardSecondaryHighlight | null =>
{
    if (step === 'place-attacks' && !handDragging)
    {
        return null;
    }

    if (step === 'fire-synergy' && handDragging)
    {
        return {
            targetId: 'hand',
            label: 'Drag from hand',
        };
    }

    return TUTORIAL_WIZARD_SECONDARY_HIGHLIGHT_BY_STEP[step] ?? null;
};

export const resolveTutorialWizardTarget = (
    step: TutorialWizardStep,
    handDragging: boolean,
): TutorialWizardTargetId =>
{
    if ((step === 'place-attacks' || step === 'fire-synergy') && handDragging)
    {
        return 'chain-row';
    }

    return TUTORIAL_WIZARD_TARGET_BY_STEP[step];
};

export const getTutorialWizardTargetLabel = (
    step: TutorialWizardStep,
    handDragging: boolean,
): string =>
{
    if (step === 'place-attacks' && handDragging)
    {
        return TUTORIAL_WIZARD_SECONDARY_HIGHLIGHT_BY_STEP['place-attacks']?.label
            ?? 'Drop here';
    }

    if (step === 'place-attacks')
    {
        return 'Drag a card';
    }

    if (step === 'strike')
    {
        return 'Your chain';
    }

    if (step === 'energy')
    {
        return 'Board stays between attacks';
    }

    if (step === 'move-chain-start')
    {
        return 'Move start here';
    }

    if (step === 'fire-synergy' && handDragging)
    {
        return 'Drop on this row';
    }

    if (step === 'fire-synergy')
    {
        return 'Your Fire chain';
    }

    return 'Click here';
};

export const TUTORIAL_WIZARD_TARGET_BY_STEP: Record<TutorialWizardStep, TutorialWizardTargetId> = {
    'welcome': 'none',
    'chain-start': 'chain-start-tile',
    'place-attacks': 'hand',
    'strike': 'grid',
    'energy': 'grid',
    'move-chain-start': 'chain-start-tile',
    'round-reset': 'grid',
    'fire-synergy': 'grid',
    'complete': 'none',
};

export const TUTORIAL_WIZARD_HINT =
    'Follow each step in order: chain start, attacks, energy, move chain start, round reset, then Fire.';

export const getTutorialCoachChainStartHighlightRow = (
    coachStep: TutorialWizardStep | null,
    currentChainStartRow: number,
): number =>
{
    if (coachStep === 'chain-start')
    {
        return 0;
    }

    if (coachStep === 'move-chain-start')
    {
        return TUTORIAL_MOVE_CHAIN_START_TARGET_ROW;
    }

    return currentChainStartRow;
};
