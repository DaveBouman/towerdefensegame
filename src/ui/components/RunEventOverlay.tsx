import { useMemo, useState } from 'react';
import {
    applyRunEventEffects,
    buildIconMatchRound,
    getRunEvent,
    getWheelSegmentIndex,
    getWheelSpinEffects,
    resolveIconMatchPick,
    rollWheelSegment,
    WHEEL_SEGMENTS,
    type AppliedEventMessage,
    type AppliedEventResult,
    type EventIconId,
    type IconMatchRound,
    type WheelSegment,
    type RunEventChoice,
} from '../../game/run/runEvents';
import { seedScope } from '../../game/random/rng';
import { getRunPuzzle, rollPuzzleId } from '../../game/run/runPuzzles';
import { getCardDefinitionOrThrow } from '../../game/cardGame/config/cardRegistry';
import { EventIcon } from './EventIcon';

type EventPhase = 'choices' | 'wheel' | 'matcher' | 'puzzle-brief' | 'result';

interface RunEventOverlayProps {
    eventId: string;
    nodeId: string;
    seed: string;
    playerHealth: number;
    maxHealth: number;
    gold: number;
    deck: string[];
    trinkets: string[];
    onFinish: (result: AppliedEventResult) => void;
    onStartPuzzle: (puzzleId: string) => void;
}

const toneClass = (tone: AppliedEventMessage['tone']): string =>
{
    switch (tone)
    {
        case 'good': return 'run-event__message--good';
        case 'bad': return 'run-event__message--bad';
        default: return 'run-event__message--neutral';
    }
};

export const RunEventOverlay = ({
    eventId,
    nodeId,
    seed,
    playerHealth,
    maxHealth,
    gold,
    deck,
    trinkets,
    onFinish,
    onStartPuzzle,
}: RunEventOverlayProps) =>
{
    const event = getRunEvent(eventId);
    const [ phase, setPhase ] = useState<EventPhase>('choices');
    const [ puzzleId, setPuzzleId ] = useState<string | null>(null);
    const [ messages, setMessages ] = useState<AppliedEventMessage[]>([]);
    const [ snapshot, setSnapshot ] = useState({
        playerHealth,
        gold,
        deck,
        trinkets,
    });

    const [ wheelSpinning, setWheelSpinning ] = useState(false);
    const [ wheelRotation, setWheelRotation ] = useState(0);

    const matchRound = useMemo<IconMatchRound | null>(() =>
    {
        if (phase !== 'matcher')
        {
            return null;
        }

        seedScope(seed, `event:${nodeId}:match`);

        return buildIconMatchRound();
    }, [ phase, seed, nodeId ]);

    const runState = () => ({
        playerHealth: snapshot.playerHealth,
        maxHealth,
        gold: snapshot.gold,
        deck: snapshot.deck,
        trinkets: snapshot.trinkets,
    });

    const showResult = (result: AppliedEventResult): void =>
    {
        setSnapshot({
            playerHealth: result.playerHealth,
            gold: result.gold,
            deck: result.deck,
            trinkets: result.trinkets,
        });
        setMessages(result.messages);
        setPhase('result');
    };

    const handleChoice = (choice: RunEventChoice): void =>
    {
        const openWheel = choice.effects.some((effect) => effect.kind === 'open-wheel');
        const openMatch = choice.effects.some((effect) => effect.kind === 'open-icon-match');
        const openPuzzle = choice.effects.find((effect) => effect.kind === 'open-puzzle');

        if (openWheel)
        {
            setPhase('wheel');
            return;
        }

        if (openMatch)
        {
            setPhase('matcher');
            return;
        }

        if (openPuzzle)
        {
            seedScope(seed, `event:${nodeId}:puzzle`);
            const rolledId = openPuzzle.puzzleId === '__random__'
                ? rollPuzzleId()
                : openPuzzle.puzzleId;

            setPuzzleId(rolledId);
            setPhase('puzzle-brief');
            return;
        }

        showResult(applyRunEventEffects(choice.effects, runState()));
    };

    const spinWheel = (): void =>
    {
        if (wheelSpinning)
        {
            return;
        }

        seedScope(seed, `event:${nodeId}:wheel`);
        const segment = rollWheelSegment();
        const index = getWheelSegmentIndex(segment.id);
        const slice = 360 / WHEEL_SEGMENTS.length;
        const target = 360 * 6 + (WHEEL_SEGMENTS.length - index) * slice - slice / 2;

        setWheelSpinning(true);
        setWheelRotation(target);

        window.setTimeout(() =>
        {
            setWheelSpinning(false);
            showResult(applyRunEventEffects(getWheelSpinEffects(segment), runState()));
        }, 2600);
    };

    const pickMatcherIcon = (icon: EventIconId): void =>
    {
        if (!matchRound)
        {
            return;
        }

        showResult(resolveIconMatchPick(matchRound, icon, runState()));
    };

    const finish = (): void =>
    {
        onFinish({
            playerHealth: snapshot.playerHealth,
            gold: snapshot.gold,
            deck: snapshot.deck,
            trinkets: snapshot.trinkets,
            messages,
        });
    };

    const puzzle = puzzleId ? getRunPuzzle(puzzleId) : null;

    const beginPuzzle = (): void =>
    {
        if (!puzzleId)
        {
            return;
        }

        onStartPuzzle(puzzleId);
    };

    return (
        <div className="run-event">
            <div className="run-event__panel">
                <header className="run-event__header">
                    <span className="run-event__icon">
                        <EventIcon icon={event.icon} />
                    </span>
                    <h1 className="run-event__title">{event.title}</h1>
                    <p className="run-event__intro">{event.intro}</p>
                </header>

                {phase === 'choices' && (
                    <div className="run-event__choices">
                        {event.choices.map((choice) => (
                            <button
                                key={choice.id}
                                type="button"
                                className="run-event__choice"
                                onClick={() => handleChoice(choice)}
                            >
                                <span className="run-event__choice-icon">
                                    <EventIcon icon={choice.icon} />
                                </span>
                                <span className="run-event__choice-label">{choice.label}</span>
                                <span className="run-event__choice-desc">{choice.description}</span>
                            </button>
                        ))}
                    </div>
                )}

                {phase === 'wheel' && (
                    <div className="run-event__wheel-wrap">
                        <div
                            className={`run-event__wheel${wheelSpinning ? ' run-event__wheel--spinning' : ''}`}
                            style={{ transform: `rotate(${wheelRotation}deg)` }}
                            aria-label="Prize wheel"
                        />
                        <div className="run-event__wheel-pointer" aria-hidden="true" />
                        <div className="run-event__wheel-legend">
                            {WHEEL_SEGMENTS.map((segment) => (
                                <span key={segment.id} className="run-event__wheel-legend-item">
                                    <EventIcon icon={segment.icon} />
                                    {segment.label}
                                </span>
                            ))}
                        </div>
                        {!wheelSpinning && phase === 'wheel' && messages.length === 0 && (
                            <button type="button" className="run-event__spin-btn" onClick={spinWheel}>
                                Spin!
                            </button>
                        )}
                    </div>
                )}

                {phase === 'matcher' && matchRound && (
                    <div className="run-event__matcher">
                        <p className="run-event__matcher-hint">Which sigil appears twice?</p>
                        <div className="run-event__matcher-options">
                            {matchRound.options.map((icon, index) => (
                                <button
                                    key={`${icon}-${index}`}
                                    type="button"
                                    className="run-event__matcher-btn"
                                    onClick={() => pickMatcherIcon(icon)}
                                >
                                    <EventIcon icon={icon} />
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {phase === 'puzzle-brief' && puzzle && (
                    <div className="run-event__puzzle-brief">
                        <h2 className="run-event__puzzle-title">{puzzle.title}</h2>
                        <p className="run-event__puzzle-intro">{puzzle.intro}</p>
                        <p className="run-event__puzzle-goal">
                            Goal: deal at least <strong>{puzzle.damageTarget}</strong> damage
                            with <strong>{puzzle.cards.length}</strong> cards in one attack.
                        </p>
                        <p className="run-event__puzzle-hint">{puzzle.hint}</p>
                        <ul className="run-event__puzzle-cards">
                            {puzzle.cards.map((card, index) => (
                                <li key={`${card.definitionId}-${index}`}>
                                    {getCardDefinitionOrThrow(card.definitionId).label}
                                </li>
                            ))}
                        </ul>
                        <button type="button" className="run-event__continue" onClick={beginPuzzle}>
                            Begin Trial
                        </button>
                    </div>
                )}

                {phase === 'result' && (
                    <div className="run-event__result">
                        <ul className="run-event__messages">
                            {messages.length === 0 ? (
                                <li className="run-event__message run-event__message--neutral">Nothing changed.</li>
                            ) : (
                                messages.map((message, index) => (
                                    <li
                                        key={`${message.text}-${index}`}
                                        className={`run-event__message ${toneClass(message.tone)}`}
                                    >
                                        {message.text}
                                    </li>
                                ))
                            )}
                        </ul>
                        <div className="run-event__stats">
                            <span>HP {snapshot.playerHealth}/{maxHealth}</span>
                            <span>{snapshot.gold} gold</span>
                            {snapshot.trinkets.length > 0 && (
                                <span>{snapshot.trinkets.length} trinket(s)</span>
                            )}
                        </div>
                        <button type="button" className="run-event__continue" onClick={finish}>
                            Continue
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
