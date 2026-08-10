import { useCallback, useEffect, useState } from 'react';

const TUTORIAL_STORAGE_KEY = 'card-chain-has-seen-tutorial';

export type TutorialStep = 'intro' | 'battle-coach' | 'reward-tip' | 'done';

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

/** First-run map intro: chain combat + energy in a short overlay. */
export const TutorialIntroOverlay = ({ onDismiss }: { onDismiss: () => void }) => (
    <div className="tutorial-overlay">
        <div className="tutorial-overlay__panel">
            <p className="tutorial-overlay__eyebrow">First run</p>
            <h1 className="tutorial-overlay__title">Chain the grid</h1>
            <p className="tutorial-overlay__body">
                Place cards so their arrows form a path. Set chain start in column 0, then Attack —
                cards resolve in order along the chain.
            </p>
            <p className="tutorial-overlay__body">
                Each Attack costs 1 energy. When energy runs out, the board clears and a new round
                begins. Hand rerolls are shared across all fights on the current floor.
            </p>
            <button type="button" className="tutorial-overlay__button" onClick={onDismiss}>
                Got it — pick a route
            </button>
        </div>
    </div>
);

/** In-fight coach strip for the first battle. */
export const TutorialCoachStrip = ({ onDismiss }: { onDismiss: () => void }) => (
    <aside className="tutorial-coach">
        <h2 className="tutorial-coach__title">Combat coach</h2>
        <ol className="tutorial-coach__steps">
            <li>Drag cards from your hand onto the board.</li>
            <li>Aim arrows so they chain; start from column 0.</li>
            <li>Click Attack — the enemy responds after each strike.</li>
        </ol>
        <button
            type="button"
            className="tutorial-coach__dismiss"
            onClick={(event) =>
            {
                event.stopPropagation();
                onDismiss();
            }}
        >
            Dismiss
        </button>
    </aside>
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
    showIntro: boolean;
    showBattleCoach: boolean;
    showRewardTip: boolean;
    dismissIntro: () => void;
    dismissBattleCoach: () => void;
    dismissRewardTip: () => void;
    onFirstBattleStart: () => void;
    onFirstBattleWon: () => void;
} =>
{
    const [ step, setStep ] = useState<TutorialStep>(() =>
        (hasSeenTutorial() ? 'done' : 'intro'));
    const [ battleCoachVisible, setBattleCoachVisible ] = useState(false);
    const [ rewardTipVisible, setRewardTipVisible ] = useState(false);

    useEffect(() =>
    {
        if (step === 'done')
        {
            markTutorialSeen();
        }
    }, [ step ]);

    const dismissIntro = useCallback((): void =>
    {
        setStep('battle-coach');
    }, []);

    const onFirstBattleStart = useCallback((): void =>
    {
        setStep((prev) =>
        {
            if (prev === 'battle-coach' || prev === 'intro')
            {
                setBattleCoachVisible(true);

                return 'battle-coach';
            }

            return prev;
        });
    }, []);

    const dismissBattleCoach = useCallback((): void =>
    {
        setBattleCoachVisible(false);
    }, []);

    const onFirstBattleWon = useCallback((): void =>
    {
        setStep((prev) =>
        {
            if (prev === 'battle-coach' || prev === 'reward-tip')
            {
                setBattleCoachVisible(false);
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

    return {
        step,
        showIntro: step === 'intro',
        showBattleCoach: battleCoachVisible,
        showRewardTip: rewardTipVisible,
        dismissIntro,
        dismissBattleCoach,
        dismissRewardTip,
        onFirstBattleStart,
        onFirstBattleWon,
    };
};
