import { useMemo } from 'react';
import { groupRunDeckEntries, type RunDeckCard } from '../../game/run/runDeck';
import { CardChip } from './CardChip';
import { ModalShell } from './CyberPanel';

interface RunDeckViewPopupProps {
    deck: readonly RunDeckCard[];
    title?: string;
    onClose: () => void;
}

/** Nested popup listing the current run deck (grouped copies with arrows). */
export const RunDeckViewPopup = ({
    deck,
    title = 'Your deck',
    onClose,
}: RunDeckViewPopupProps) =>
{
    const deckEntries = useMemo(() => groupRunDeckEntries(deck), [ deck ]);

    return (
        <ModalShell
            variant="cyan"
            rootClassName="run-deck-popup"
            panelClassName="run-deck-popup__panel"
            onBackdropClick={onClose}
            role="dialog"
            ariaModal
            ariaLabel={title}
        >
            <h2 className="run-deck-popup__title">
                {title} ({deck.length})
            </h2>
            <div className="run-deck-popup__strip">
                {deckEntries.map((entry) => (
                    <div
                        key={`${entry.definitionId}-${entry.arrow ?? 'any'}-${entry.loopArrow ?? ''}`}
                        className="run-deck-popup__item"
                    >
                        <CardChip
                            definitionId={entry.definitionId}
                            label={entry.label}
                            arrow={entry.arrow}
                            loopArrow={entry.loopArrow}
                            countBadge={entry.count}
                            size="pile"
                        />
                    </div>
                ))}
            </div>
            <button type="button" className="run-deck-popup__close" onClick={onClose}>
                Close
            </button>
        </ModalShell>
    );
};
