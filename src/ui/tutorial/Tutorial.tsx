import { useCallback, useEffect, useState } from 'react';

const TUTORIAL_STORAGE_KEY = 'card-chain-has-seen-tutorial';

export type TutorialStep = 'wizard' | 'map-tip' | 'reward-tip' | 'done';

export const hasSeenTutorial = (): boolean =>
{
    try
    {
        return localStorage.getItem(TUTORIAL_STORAGE_KEY) === '1';
    }
    catch
    {
        return false;
    }
};

export const markTutorialSeen = (): void =>
{
    try
    {
        localStorage.setItem(TUTORIAL_STORAGE_KEY, '1');
    }
    catch
    {
        // Ignore private-mode / blocked storage.
    }
};

export const clearTutorialSeen = (): void =>
{
    try
    {
        localStorage.removeItem(TUTORIAL_STORAGE_KEY);
    }
    catch
    {
        // Ignore private-mode / blocked storage.
    }
};

/** After the training sim: map, energy, and rerolls in a short overlay. */
export const TutorialMapTipOverlay = ({ onDismiss }: { onDismiss: () => void }) => (
    <div className="tutorial-overlay">
        <div className="tutorial-overlay__panel">
            <p className="tutorial-overlay__eyebrow">Training complete</p>
            <h1 className="tutorial-overlay__title">Pick your route</h1>
            <p className="tutorial-overlay__body">
                Choose a node on the map to begin your run. Battles use the same chain rules you
                just practiced — place cards, set chain start on column 0, then Attack.
            </p>
            <p className="tutorial-overlay__body">
                Each Attack costs 1 energy. When energy runs out, the board clears and a new round
                begins. Hand rerolls are shared across all fights on the current floor.
            </p>
            <button type="button" className="tutorial-overlay__button" onClick={onDismiss}>
                Got it — choose a node
            </button>
        </div>
    </div>
);

/** One tip after the first victory about rewards and shops. */
export const TutorialRewardTipOverlay = ({ onDismiss }: { onDismiss: () => void }) => (
    <div className="tutorial-overlay">
        <div className="tutorial-overlay__panel">
            <p className="tutorial-overlay__eyebrow">After the fight</p>
            <h1 className="tutorial-overlay__title">Spoils &amp; chrome</h1>
            <p className="tutorial-overlay__body">
                Victories offer card rewards for your run deck. Ripperdoc shops spend creds on cards,
                body mods, heals, or cutting dead weight from your deck.
            </p>
            <button type="button" className="tutorial-overlay__button" onClick={onDismiss}>
                Continue
            </button>
        </div>
    </div>
);

/** Hook: drives first-run teaching steps until dismissed / completed. */
export const useTutorial = (): {
    step: TutorialStep;
    needsTutorialWizard: boolean;
    showMapTip: boolean;
    showRewardTip: boolean;
    dismissMapTip: () => void;
    dismissRewardTip: () => void;
    onWizardComplete: () => void;
    onFirstBattleWon: () => void;
    replayTutorial: () => void;
} =>
{
    const [ step, setStep ] = useState<TutorialStep>(() =>
        (hasSeenTutorial() ? 'done' : 'wizard'));
    const [ mapTipVisible, setMapTipVisible ] = useState(false);
    const [ rewardTipVisible, setRewardTipVisible ] = useState(false);

    useEffect(() =>
    {
        if (step === 'done')
        {
            markTutorialSeen();
        }
    }, [ step ]);

    const onWizardComplete = useCallback((): void =>
    {
        setStep('map-tip');
        setMapTipVisible(true);
    }, []);

    const dismissMapTip = useCallback((): void =>
    {
        setMapTipVisible(false);
        setStep('reward-tip');
    }, []);

    const onFirstBattleWon = useCallback((): void =>
    {
        setStep((prev) =>
        {
            if (prev === 'reward-tip' || prev === 'map-tip')
            {
                setRewardTipVisible(true);
                return 'reward-tip';
            }

            return prev;
        });
    }, []);

    const dismissRewardTip = useCallback((): void =>
    {
        setRewardTipVisible(false);
        setStep('done');
        markTutorialSeen();
    }, []);

    const replayTutorial = useCallback((): void =>
    {
        clearTutorialSeen();
        setMapTipVisible(false);
        setRewardTipVisible(false);
        setStep('wizard');
    }, []);

    return {
        step,
        needsTutorialWizard: step === 'wizard',
        showMapTip: mapTipVisible,
        showRewardTip: rewardTipVisible,
        dismissMapTip,
        dismissRewardTip,
        onWizardComplete,
        onFirstBattleWon,
        replayTutorial,
    };
};
