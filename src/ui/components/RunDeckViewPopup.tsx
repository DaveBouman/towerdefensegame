import { useMemo } from 'react';
import { groupRunDeckEntries, type RunDeckCard } from '../../game/run/runDeck';
import { CardInspectOverlay, type CardInspectEntry } from './CardInspectOverlay';

interface RunDeckViewPopupProps {
    deck: readonly RunDeckCard[];
    title?: string;
    onClose: () => void;
}

const entryKey = (entry: ReturnType<typeof groupRunDeckEntries>[number]): string =>
    `${entry.definitionId}-${entry.arrow ?? 'any'}-${entry.loopArrow ?? ''}`;

/** Run-deck inspector — matches the card index / pile inspector layout. */
export const RunDeckViewPopup = ({
    deck,
    title = 'Your deck',
    onClose,
}: RunDeckViewPopupProps) =>
{
    const entries = useMemo((): CardInspectEntry[] =>
        groupRunDeckEntries(deck).map((entry) => ({
            id: entryKey(entry),
            definitionId: entry.definitionId,
            label: entry.label,
            count: entry.count,
            arrow: entry.arrow,
            loopArrow: entry.loopArrow,
        })),
    [ deck ]);

    return (
        <CardInspectOverlay
            onClose={onClose}
            ariaLabel={title}
            eyebrow="Run deck"
            title={title}
            countLabel={`${deck.length} cards`}
            entries={entries}
            emptyMessage="This deck is empty."
            detailHint="Select a card to inspect its dossier."
            subtitle="Grouped copies share a tile. Arrow is the chain direction you picked."
            variant="cyan"
            rootClassName="card-inspect--run-deck"
        />
    );
};
