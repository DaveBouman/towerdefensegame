import { useEffect, useMemo, useState } from 'react';
import { EventBus } from '../../game/EventBus';
import { GAME_EVENTS } from '../../game/events/gameEvents';
import type { PileCardEntry, PileViewPayload } from '../../game/events/gameEventMap';
import { CardChip } from './CardChip';

interface GroupedPileCard {
    entry: PileCardEntry;
    count: number;
}

const groupCards = (cards: readonly PileCardEntry[]): GroupedPileCard[] =>
{
    const groups = new Map<string, GroupedPileCard>();

    for (const entry of cards)
    {
        const existing = groups.get(entry.definitionId);

        if (existing)
        {
            existing.count += 1;
        }
        else
        {
            groups.set(entry.definitionId, { entry, count: 1 });
        }
    }

    return [ ...groups.values() ].sort((a, b) => a.entry.label.localeCompare(b.entry.label));
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

    const groups = useMemo(
        () => (payload ? groupCards(payload.cards) : []),
        [ payload ],
    );

    if (!payload)
    {
        return null;
    }

    const close = (): void => setPayload(null);
    const isDeck = payload.kind === 'deck';

    return (
        <div className="pile-view" role="dialog" aria-modal="true" onClick={close}>
            <div className="pile-view__panel" onClick={(event) => event.stopPropagation()}>
                <header className="pile-view__header">
                    <h2 className="pile-view__title">{payload.title}</h2>
                    <span className="pile-view__count">{payload.cards.length} cards</span>
                    <button type="button" className="pile-view__close" onClick={close} aria-label="Close">
                        ×
                    </button>
                </header>

                {groups.length === 0 ? (
                    <p className="pile-view__empty">This pile is empty.</p>
                ) : (
                    <ul className="pile-view__grid">
                        {groups.map(({ entry, count }) => (
                            <li key={entry.definitionId} className="pile-view__card">
                                <CardChip
                                    definitionId={entry.definitionId}
                                    label={entry.label}
                                    power={entry.power}
                                    behaviorId={entry.behaviorId}
                                    size="pile"
                                    countBadge={count}
                                />
                            </li>
                        ))}
                    </ul>
                )}

                <p className="pile-view__hint">
                    {isDeck
                        ? 'Grouped alphabetically — draw order is hidden.'
                        : 'Most recent discard is on top of the pile.'}
                </p>
            </div>
        </div>
    );
};
