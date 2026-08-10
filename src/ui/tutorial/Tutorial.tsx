import { useCallback, useEffect, useState } from 'react';
import { GAME_RULES } from '../../game/cardGame/config/cardRegistry';

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

/** First-run map intro: chain combat + energy in a short overlay. */
export const TutorialIntroOverlay = ({ onDismiss }: { onDismiss: () => void }) => (
    <div className="tutorial-overlay">
        <div className="tutorial-overlay__panel">
            <p className="tutorial-overlay__eyebrow">First run</p>
            <h1 className="tutorial-overlay__title">Chain the grid</h1>
            <p className="tutorial-overlay__body">
                Place cards so their arrows form a path. Your starter already seeds light
                synergies — Fire, Poison, Rupture, Bulwark, Surge — so chains can combo.
                Click a column-0 tile to set chain start, then Attack.
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
            <li>Click a column-0 tile to set where the chain starts.</li>
            <li>Try a synergy: Fire then Attack/Defend, or Poison then Defends.</li>
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

/** First-round tip: off-chain attack/defense cards still contribute. */
export const TutorialOffChainTipOverlay = ({ onDismiss }: { onDismiss: () => void }) =>
{
    const { attackDamage, defendArmor } = GAME_RULES.offChainBonus;

    return (
        <div className="tutorial-overlay tutorial-overlay--battle">
            <div className="tutorial-overlay__panel">
                <p className="tutorial-overlay__eyebrow">Round 1 tip</p>
                <h1 className="tutorial-overlay__title">Loose board cards</h1>
                <p className="tutorial-overlay__body">
                    Cards you place on the battlefield still help when you Attack — even if they
                    are not linked into your chain. Only <strong>attack</strong> and{' '}
                    <strong>defense</strong> cards count this way.
                </p>
                <p className="tutorial-overlay__body">
                    Each loose attack adds +{attackDamage} damage. Each loose defense adds +{defendArmor}{' '}
                    armor. Other card types must be in the chain to take effect.
                </p>
                <button
                    type="button"
                    className="tutorial-overlay__button"
                    onClick={(event) =>
                    {
                        event.stopPropagation();
                        onDismiss();
                    }}
                >
                    Got it
                </button>
            </div>
        </div>
    );
};

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
    showOffChainTip: boolean;
    showRewardTip: boolean;
    dismissIntro: () => void;
    dismissBattleCoach: () => void;
    dismissOffChainTip: () => void;
    dismissRewardTip: () => void;
    onFirstBattleStart: () => void;
    onFirstBattleWon: () => void;
    replayTutorial: () => void;
} =>
{
    const [ step, setStep ] = useState<TutorialStep>(() =>
        (hasSeenTutorial() ? 'done' : 'intro'));
    const [ battleCoachVisible, setBattleCoachVisible ] = useState(false);
    const [ offChainTipVisible, setOffChainTipVisible ] = useState(false);
    const [ offChainTipEligible, setOffChainTipEligible ] = useState(false);
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
                setOffChainTipEligible(true);

                return 'battle-coach';
            }

            return prev;
        });
    }, []);

    const dismissBattleCoach = useCallback((): void =>
    {
        setBattleCoachVisible(false);

        if (offChainTipEligible)
        {
            setOffChainTipVisible(true);
        }
    }, [ offChainTipEligible ]);

    const dismissOffChainTip = useCallback((): void =>
    {
        setOffChainTipVisible(false);
        setOffChainTipEligible(false);
    }, []);

    const onFirstBattleWon = useCallback((): void =>
    {
        setStep((prev) =>
        {
            if (prev === 'battle-coach' || prev === 'reward-tip')
            {
                setBattleCoachVisible(false);
                setOffChainTipVisible(false);
                setOffChainTipEligible(false);
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
        setBattleCoachVisible(false);
        setOffChainTipVisible(false);
        setOffChainTipEligible(false);
        setRewardTipVisible(false);
        setStep('intro');
    }, []);

    return {
        step,
        showIntro: step === 'intro',
        showBattleCoach: battleCoachVisible,
        showOffChainTip: offChainTipVisible,
        showRewardTip: rewardTipVisible,
        dismissIntro,
        dismissBattleCoach,
        dismissOffChainTip,
        dismissRewardTip,
        onFirstBattleStart,
        onFirstBattleWon,
        replayTutorial,
    };
};
