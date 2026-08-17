import type { ReactNode } from 'react';
import type { CardDirection } from '../../game/cardGame/domain/cardDirections';
import { CardChip } from './CardChip';
import { ModalShell, type CyberPanelVariant } from './CyberPanel';

export interface DeckPickerEntry {
    definitionId: string;
    label: string;
    count: number;
    arrow?: CardDirection;
    loopArrow?: CardDirection;
}

export type DeckPickerLayout = 'chips' | 'list';

interface DeckCardPickerProps {
    eyebrow: string;
    title: string;
    subtitle: string;
    entries: readonly DeckPickerEntry[];
    layout?: DeckPickerLayout;
    variant?: CyberPanelVariant;
    rootClassName?: string;
    cancelLabel?: string;
    onPick: (entry: DeckPickerEntry) => void;
    onCancel: () => void;
    /** Optional key override when entries lack unique arrows. */
    entryKey?: (entry: DeckPickerEntry) => string;
    footer?: ReactNode;
}

const defaultEntryKey = (entry: DeckPickerEntry): string =>
    `${entry.definitionId}:${entry.arrow ?? ''}:${entry.loopArrow ?? ''}`;

/**
 * Shared deck-card picker used by shop remove/upgrade/reroute and rest upgrade.
 */
export const DeckCardPicker = ({
    eyebrow,
    title,
    subtitle,
    entries,
    layout = 'chips',
    variant = 'gold',
    rootClassName = 'shop-overlay shop-overlay--enter',
    cancelLabel = 'Cancel',
    onPick,
    onCancel,
    entryKey = defaultEntryKey,
    footer,
}: DeckCardPickerProps) => (
    <ModalShell
        variant={variant}
        rootClassName={rootClassName}
        panelClassName="shop-overlay__panel"
    >
        <p className="shop-overlay__eyebrow">{eyebrow}</p>
        <h1 className="shop-overlay__title">{title}</h1>
        <p className="shop-overlay__subtitle">{subtitle}</p>
        {layout === 'chips' ? (
            <div className="shop-overlay__deck-strip">
                {entries.map((entry) => (
                    <button
                        key={entryKey(entry)}
                        type="button"
                        className="shop-overlay__deck-pick"
                        onClick={() => onPick(entry)}
                    >
                        <CardChip
                            definitionId={entry.definitionId}
                            label={entry.label}
                            arrow={entry.arrow}
                            loopArrow={entry.loopArrow}
                            countBadge={entry.count}
                            size="pile"
                        />
                    </button>
                ))}
            </div>
        ) : (
            <ul className="shop-overlay__deck-list">
                {entries.map((entry) => (
                    <li key={entryKey(entry)}>
                        <button
                            type="button"
                            className="shop-overlay__deck-card"
                            onClick={() => onPick(entry)}
                        >
                            <span>{entry.label}</span>
                            <span className="shop-overlay__deck-count">×{entry.count}</span>
                        </button>
                    </li>
                ))}
            </ul>
        )}
        {footer}
        <button type="button" className="shop-overlay__continue" onClick={onCancel}>
            {cancelLabel}
        </button>
    </ModalShell>
);
