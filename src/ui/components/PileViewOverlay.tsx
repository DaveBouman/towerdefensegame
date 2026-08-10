import { useEffect, useMemo, useState } from 'react';
import { EventBus } from '../../game/EventBus';
import { GAME_EVENTS } from '../../game/events/gameEvents';
import type { PileCardEntry, PileViewPayload } from '../../game/events/gameEventMap';
import { CardChip } from './CardChip';

interface GroupedPileCard {
    entry: PileCardEntry;
    count: number;
}

const groupKey = (entry: PileCardEntry): string =>
    `${entry.definitionId}:${entry.arrow ?? ''}:${entry.loopArrow ?? ''}`;

/** Groups identical face+arrow cards; optionally sorts alphabetically (draw pile). */
const groupCards = (
    cards: readonly PileCardEntry[],
    sortAlphabetically: boolean,
): GroupedPileCard[] =>
{
    const groups = new Map<string, GroupedPileCard>();

    for (const entry of cards)
    {
        const key = groupKey(entry);
        const existing = groups.get(key);

        if (existing)
        {
            existing.count += 1;
        }
        else
        {
            groups.set(key, { entry, count: 1 });
        }
    }

    const grouped = [ ...groups.values() ];

    if (sortAlphabetically)
    {
        grouped.sort((a, b) =>
        {
            const byLabel = a.entry.label.localeCompare(b.entry.label);

            if (byLabel !== 0)
            {
                return byLabel;
            }

            return groupKey(a.entry).localeCompare(groupKey(b.entry));
        });
    }

    return grouped;
};

export const PileViewOverlay = () =>
{
    const [ payload, setPayload ] = useState<PileViewPayload | null>(null);

    useEffect(() =>
    {
        const onOpen = (next: PileViewPayload): void =>
        {
            setPayload(next);
        };

        EventBus.on(GAME_EVENTS.PILE_VIEW_OPEN, onOpen);

        return () => EventBus.off(GAME_EVENTS.PILE_VIEW_OPEN, onOpen);
    }, []);

    useEffect(() =>
    {
        if (!payload)
        {
            return;
        }

        const onKey = (event: KeyboardEvent): void =>
        {
            if (event.key === 'Escape')
            {
                setPayload(null);
            }
        };

        window.addEventListener('keydown', onKey);

        return () => window.removeEventListener('keydown', onKey);
    }, [ payload ]);

    const isDeck = payload?.kind === 'deck';
    const groups = useMemo(
        () => (payload ? groupCards(payload.cards, payload.kind === 'deck') : []),
        [ payload ],
    );

    if (!payload)
    {
        return null;
    }

    const close = (): void => setPayload(null);

    return (
        <div
            className={`pile-view pile-view--${payload.kind}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="pile-view-title"
            onClick={close}
        >
            <div className="pile-view__backdrop" aria-hidden="true" />
            <div className="pile-view__panel" onClick={(event) => event.stopPropagation()}>
                <span className="pile-view__corner pile-view__corner--tl" aria-hidden="true" />
                <span className="pile-view__corner pile-view__corner--tr" aria-hidden="true" />
                <span className="pile-view__corner pile-view__corner--bl" aria-hidden="true" />
                <span className="pile-view__corner pile-view__corner--br" aria-hidden="true" />
                <div className="pile-view__scan" aria-hidden="true" />

                <header className="pile-view__header">
                    <div className="pile-view__heading">
                        <span className="pile-view__eyebrow">
                            {isDeck ? 'Draw pile' : 'Discard pile'}
                        </span>
                        <h2 className="pile-view__title" id="pile-view-title">{payload.title}</h2>
                    </div>
                    <span className="pile-view__count">{payload.cards.length} cards</span>
                    <button type="button" className="pile-view__close" onClick={close} aria-label="Close">
                        ×
                    </button>
                </header>

                <div className="pile-view__body">
                    {groups.length === 0 ? (
                        <p className="pile-view__empty">This pile is empty.</p>
                    ) : (
                        <ul className="pile-view__grid">
                            {groups.map(({ entry, count }) => (
                                <li key={groupKey(entry)} className="pile-view__card">
                                    <CardChip
                                        definitionId={entry.definitionId}
                                        label={entry.label}
                                        power={entry.power}
                                        behaviorId={entry.behaviorId}
                                        arrow={entry.arrow}
                                        loopArrow={entry.loopArrow}
                                        size="pile"
                                        countBadge={count}
                                    />
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <footer className="pile-view__hint">
                    {isDeck
                        ? 'Grouped alphabetically — draw order is hidden. Arrow shows chain direction.'
                        : 'Top of pile first (newest discard). Arrow shows chain direction.'}
                </footer>
            </div>
        </div>
    );
};
