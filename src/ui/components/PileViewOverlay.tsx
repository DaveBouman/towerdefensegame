import { useEffect, useMemo, useState } from 'react';
import { EventBus } from '../../game/EventBus';
import { GAME_EVENTS } from '../../game/events/gameEvents';
import type { PileCardEntry, PileViewPayload } from '../../game/events/gameEventMap';
import { CardInspectOverlay, type CardInspectEntry } from './CardInspectOverlay';

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

const toInspectEntries = (groups: GroupedPileCard[]): CardInspectEntry[] =>
    groups.map(({ entry, count }) => ({
        id: groupKey(entry),
        definitionId: entry.definitionId,
        label: entry.label,
        count,
        arrow: entry.arrow,
        loopArrow: entry.loopArrow,
    }));

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

    const isDeck = payload?.kind === 'deck';
    const isExhaust = payload?.kind === 'exhaust';
    const groups = useMemo(
        () => (payload ? groupCards(payload.cards, payload.kind === 'deck') : []),
        [ payload ],
    );
    const entries = useMemo(() => toInspectEntries(groups), [ groups ]);

    if (!payload)
    {
        return null;
    }

    const close = (): void => setPayload(null);

    return (
        <CardInspectOverlay
            onClose={close}
            ariaLabel={isDeck ? 'Draw pile' : isExhaust ? 'Exhaust pile' : 'Discard pile'}
            eyebrow={isDeck ? 'Draw pile' : isExhaust ? 'Exhaust pile' : 'Discard pile'}
            title={payload.title}
            countLabel={`${payload.cards.length} cards`}
            entries={entries}
            emptyMessage="This pile is empty."
            detailHint="Select a card to inspect its dossier."
            subtitle={isDeck
                ? 'Grouped alphabetically — draw order is hidden. Arrow shows chain direction.'
                : isExhaust
                    ? 'Destroyed this fight — newest on top. They return in the next battle.'
                    : 'Top of pile first (newest discard). Arrow shows chain direction.'}
            variant={isDeck ? 'cyan' : isExhaust ? 'gold' : 'magenta'}
            rootClassName={isDeck
                ? 'card-inspect--deck'
                : isExhaust
                    ? 'card-inspect--exhaust'
                    : 'card-inspect--graveyard'}
        />
    );
};
