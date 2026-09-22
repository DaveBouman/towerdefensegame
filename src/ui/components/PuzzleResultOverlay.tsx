import type { AppliedEventMessage } from '../../game/run/runEvents';
import {
    formatPuzzleFailHint,
    getPuzzleGoalLine,
    getRunPuzzle,
} from '../../game/run/runPuzzles';
import { EventIcon } from './EventIcon';

interface PuzzleResultOverlayProps {
    puzzleId: string;
    success: boolean;
    damageDealt: number;
    damageTarget: number;
    messages: AppliedEventMessage[];
    onContinue: () => void;
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

export const PuzzleResultOverlay = ({
    puzzleId,
    success,
    damageDealt,
    damageTarget,
    messages,
    onContinue,
}: PuzzleResultOverlayProps) =>
{
    const puzzle = getRunPuzzle(puzzleId);
    const goal = getPuzzleGoalLine(puzzle);
    const scoreLine = puzzle.win.kind === 'damage'
        ? `Scored ${damageDealt} / ${damageTarget}.`
        : goal;

    return (
        <div className="run-event">
            <div className="run-event__panel">
                <header className="run-event__header">
                    <span className="run-event__icon">
                        <EventIcon icon="puzzle" />
                    </span>
                    <h1 className="run-event__title">
                        {success ? 'Road clear' : 'Not yet'}
                    </h1>
                    <p className="run-event__intro">
                        {puzzle.title} — {scoreLine}
                    </p>
                </header>

                <div className="run-event__result">
                    <ul className="run-event__messages">
                        <li className={`run-event__message ${success ? 'run-event__message--good' : 'run-event__message--bad'}`}>
                            {success
                                ? 'Nice routing.'
                                : formatPuzzleFailHint(puzzle.win)}
                        </li>
                        {messages.map((message, index) => (
                            <li
                                key={`${message.text}-${index}`}
                                className={`run-event__message ${toneClass(message.tone)}`}
                            >
                                {message.text}
                            </li>
                        ))}
                    </ul>
                    <button type="button" className="run-event__continue" onClick={onContinue}>
                        Back to roads
                    </button>
                </div>
            </div>
        </div>
    );
};
