import type { RunEventChoice } from '../../game/run/runEvents';
import { buildChoiceFragments } from './eventChoiceDisplay';
import { CardChip } from './CardChip';

interface EventChoiceButtonProps {
    choice: RunEventChoice;
    cardPreviews: { cardId: string; count: number }[];
    onPick: (choice: RunEventChoice) => void;
}

export const EventChoiceButton = ({
    choice,
    cardPreviews,
    onPick,
}: EventChoiceButtonProps) =>
{
    const fragments = buildChoiceFragments(choice);

    return (
        <button
            type="button"
            className={`run-event__choice${cardPreviews.length > 0 ? ' run-event__choice--with-cards' : ''}`}
            onClick={() => onPick(choice)}
        >
            <span className="run-event__choice-text">
                {fragments.map((fragment, index) => (
                    <span
                        key={`${choice.id}-${index}`}
                        className={`run-event__choice-frag run-event__choice-frag--${fragment.tone}`}
                    >
                        {fragment.text}
                    </span>
                ))}
            </span>
            {cardPreviews.length > 0 && (
                <span className="run-event__choice-cards" aria-hidden="true">
                    {cardPreviews.map((preview) => (
                        <CardChip
                            key={`${choice.id}-${preview.cardId}`}
                            definitionId={preview.cardId}
                            size="pile"
                            countBadge={preview.count > 1 ? preview.count : undefined}
                            className="run-event__choice-card"
                        />
                    ))}
                </span>
            )}
        </button>
    );
};
