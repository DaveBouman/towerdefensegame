import { useCallback, useEffect, useRef, useState } from 'react';
import { EventBus } from '../../game/EventBus';
import { CardGameEventBus } from '../../game/cardGame/events/CardGameEventBus';
import { CARD_GAME_EVENTS } from '../../game/cardGame/events/cardGameEvents';
import { GAME_EVENTS } from '../../game/events/gameEvents';
import {
    isTutorialWizardPuzzle,
    type TutorialWizardStep,
    TUTORIAL_MOVE_CHAIN_START_TARGET_ROW,
    TUTORIAL_WIZARD_STEP_ORDER,
    TUTORIAL_WIZARD_STEPS,
} from '../../game/run/tutorialWizard';
import { getTutorialWizardPhaseSpec } from '../../game/run/tutorialWizardPhases';
import {
    countCardsOnRow,
    ENERGY_ATTACKS_TARGET,
    hasCardAtSlot,
    PLACE_ATTACKS_TARGET,
    slotKey,
} from '../../game/run/tutorialWizardSteps';
import {
    clearPersistedTutorialWizardStep,
    readPersistedTutorialWizardStep,
    writePersistedTutorialWizardStep,
} from './tutorialWizardSession';

/** Wizard steps that only change coach copy — session phase is applied elsewhere. */
const TUTORIAL_WIZARD_UI_ONLY_STEPS: ReadonlySet<TutorialWizardStep> = new Set([
    'energy',
    'move-chain-start',
]);

export const useTutorialWizard = (active: boolean): {
    step: TutorialWizardStep | null;
    copy: (typeof TUTORIAL_WIZARD_STEPS)[TutorialWizardStep] | null;
    stepIndex: number;
    stepCount: number;
    energy: number | null;
    maxEnergy: number | null;
    dismissWelcome: () => void;
    dismissRoundReset: () => void;
    dismissEnergyIntro: () => void;
    energyIntroDismissed: boolean;
    finishTutorial: () => void;
} =>
{
    const [ step, setStepState ] = useState<TutorialWizardStep | null>(null);
    const [ energy, setEnergy ] = useState<number | null>(null);
    const [ maxEnergy, setMaxEnergy ] = useState<number | null>(null);
    const [ energyIntroDismissed, setEnergyIntroDismissed ] = useState(false);
    const stepRef = useRef<TutorialWizardStep | null>(null);
    const energyIntroDismissedRef = useRef(false);
    const placedSlotsRef = useRef<Set<string>>(new Set());
    const chainStartRef = useRef({ row: 0, col: 0 });

    const setStep = useCallback((next: TutorialWizardStep | null): void =>
    {
        stepRef.current = next;
        writePersistedTutorialWizardStep(next);
        setStepState(next);
    }, []);

    useEffect(() =>
    {
        stepRef.current = step;
    }, [ step ]);

    useEffect(() =>
    {
        energyIntroDismissedRef.current = energyIntroDismissed;
    }, [ energyIntroDismissed ]);

    const applyPhase = useCallback((stepId: TutorialWizardStep): void =>
    {
        if (!getTutorialWizardPhaseSpec(stepId))
        {
            return;
        }

        EventBus.emit(GAME_EVENTS.TUTORIAL_WIZARD_APPLY_PHASE, { stepId });
    }, []);

    const goToStep = useCallback((next: TutorialWizardStep): void =>
    {
        if (next === 'energy')
        {
            setEnergyIntroDismissed(false);
        }

        setStep(next);

        if (!TUTORIAL_WIZARD_UI_ONLY_STEPS.has(next) && getTutorialWizardPhaseSpec(next))
        {
            applyPhase(next);
        }
    }, [ applyPhase, setStep ]);

    const resetProgress = useCallback((): void =>
    {
        placedSlotsRef.current = new Set();
        chainStartRef.current = { row: 2, col: 0 };
        setEnergy(null);
        setMaxEnergy(null);
        setStep('welcome');
    }, [ setStep ]);

    useEffect(() =>
    {
        if (!active)
        {
            return;
        }

        const persisted = readPersistedTutorialWizardStep();

        if (persisted)
        {
            setStepState(persisted);
            stepRef.current = persisted;
        }
        else
        {
            resetProgress();
        }

        const onPuzzleState = ({ puzzleId }: { puzzleId: string }): void =>
        {
            if (!isTutorialWizardPuzzle(puzzleId))
            {
                return;
            }

            resetProgress();
        };

        const onCardPlaced = ({ slot }: { slot: { row: number; col: number } }): void =>
        {
            if (stepRef.current !== 'place-attacks')
            {
                return;
            }

            placedSlotsRef.current.add(slotKey(slot.row, slot.col));
            const chainStart = chainStartRef.current;
            const onRow = countCardsOnRow(placedSlotsRef.current, chainStart.row);

            if (onRow >= PLACE_ATTACKS_TARGET
                && hasCardAtSlot(placedSlotsRef.current, chainStart.row, chainStart.col))
            {
                goToStep('strike');
            }
        };

        const onChainStart = ({ row }: { row: number }): void =>
        {
            chainStartRef.current = { row, col: 0 };

            if (stepRef.current === 'chain-start' && row === 0)
            {
                goToStep('place-attacks');
                return;
            }

            if (stepRef.current === 'move-chain-start' && row === TUTORIAL_MOVE_CHAIN_START_TARGET_ROW)
            {
                setStep('energy');
                setEnergyIntroDismissed(true);
            }
        };

        const onTutorialAttack = ({
            phaseId,
            attacksThisRound,
            energy: nextEnergy,
            maxEnergy: nextMax,
        }: {
            phaseId: TutorialWizardStep | null;
            energy: number;
            maxEnergy: number;
            attacksThisRound: number;
        }): void =>
        {
            setEnergy(nextEnergy);
            setMaxEnergy(nextMax);

            if (phaseId === 'energy'
                && attacksThisRound === 1
                && stepRef.current === 'energy'
                && energyIntroDismissedRef.current)
            {
                setStep('move-chain-start');
                setEnergyIntroDismissed(false);
            }
        };

        const onEnergyDepleted = ({
            phaseId,
            attacksThisRound,
        }: {
            phaseId: TutorialWizardStep | null;
            attacksThisRound: number;
        }): void =>
        {
            if (phaseId === 'strike')
            {
                setEnergyIntroDismissed(false);
                setStep('energy');
                return;
            }

            if (phaseId === 'energy' && attacksThisRound >= ENERGY_ATTACKS_TARGET)
            {
                setStep('round-reset');
                return;
            }

            if (phaseId === 'fire-synergy')
            {
                setStep('complete');
            }
        };

        EventBus.on(GAME_EVENTS.PUZZLE_STATE, onPuzzleState);
        CardGameEventBus.on(CARD_GAME_EVENTS.CARD_PLACED, onCardPlaced);
        EventBus.on(GAME_EVENTS.CHAIN_START_STATE, onChainStart);
        EventBus.on(GAME_EVENTS.TUTORIAL_WIZARD_ATTACK, onTutorialAttack);
        EventBus.on(GAME_EVENTS.TUTORIAL_WIZARD_ENERGY_DEPLETED, onEnergyDepleted);

        return () =>
        {
            EventBus.off(GAME_EVENTS.PUZZLE_STATE, onPuzzleState);
            CardGameEventBus.off(CARD_GAME_EVENTS.CARD_PLACED, onCardPlaced);
            EventBus.off(GAME_EVENTS.CHAIN_START_STATE, onChainStart);
            EventBus.off(GAME_EVENTS.TUTORIAL_WIZARD_ATTACK, onTutorialAttack);
            EventBus.off(GAME_EVENTS.TUTORIAL_WIZARD_ENERGY_DEPLETED, onEnergyDepleted);
        };
    }, [ active, resetProgress, goToStep, setStep ]);

    const dismissWelcome = useCallback((): void =>
    {
        goToStep('chain-start');
    }, [ goToStep ]);

    const dismissRoundReset = useCallback((): void =>
    {
        placedSlotsRef.current = new Set();
        goToStep('fire-synergy');
    }, [ goToStep ]);

    const dismissEnergyIntro = useCallback((): void =>
    {
        setEnergyIntroDismissed(true);
    }, []);

    const finishTutorial = useCallback((): void =>
    {
        clearPersistedTutorialWizardStep();
        EventBus.emit(GAME_EVENTS.TUTORIAL_WIZARD_COMPLETE);
    }, []);

    const stepIndex = step ? TUTORIAL_WIZARD_STEP_ORDER.indexOf(step) : -1;
    const copy = step ? TUTORIAL_WIZARD_STEPS[step] : null;

    return {
        step,
        copy,
        stepIndex,
        stepCount: TUTORIAL_WIZARD_STEP_ORDER.length,
        energy,
        maxEnergy,
        dismissWelcome,
        dismissRoundReset,
        dismissEnergyIntro,
        energyIntroDismissed,
        finishTutorial,
    };
};
