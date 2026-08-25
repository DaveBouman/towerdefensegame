import { useMemo } from 'react';
import { createCardInstance } from '../../game/cardGame/domain/createCardInstance';
import { resolveCardTooltip } from '../../game/cardGame/presentation/tooltips/cardTooltipRegistry';
import {
    getCollectionEntries,
    getCollectionProgress,
    type CollectionCardEntry,
} from '../../game/run/cardCollection';
import { ArchiveOverlay } from './ArchiveOverlay';
import { CardChip } from './CardChip';

interface CardCollectionOverlayProps {
    onClose: () => void;
}

const tierLabel = (tier: CollectionCardEntry['tier']): string =>
{
    if (tier === 1)
    {
        return 'Common';
    }

    if (tier === 2)
    {
        return 'Uncommon';
    }

    return 'Rare';
};

export const CardCollectionOverlay = ({ onClose }: CardCollectionOverlayProps) =>
{
    const progress = useMemo(() => getCollectionProgress(), []);
    const entries = useMemo(() => getCollectionEntries(), []);
    const tooltips = useMemo(() =>
    {
        const map = new Map<string, ReturnType<typeof resolveCardTooltip>>();

        for (const entry of entries)
        {
            if (entry.unlocked)
            {
                map.set(entry.id, resolveCardTooltip(createCardInstance(entry.id)));
            }
        }

        return map;
    }, [ entries ]);

    return (
        <ArchiveOverlay
            onClose={onClose}
            ariaLabel="Card index"
            eyebrow="Data archive"
            title="Card index"
            progressSuffix="unlocked"
            filterAriaLabel="Collection filter"
            filterLabels={{ unlocked: 'Unlocked', locked: 'Locked' }}
            emptyDetailHint="Select a card to inspect its dossier."
            variant="cyan"
            rootClassName=""
            entries={entries}
            progress={progress}
            renderItem={(entry, { selected, onSelect, onPreview }) => (
                <button
                    key={entry.id}
                    type="button"
                    className={[
                        'card-collection__item',
                        entry.unlocked ? '' : 'card-collection__item--locked',
                        selected ? 'card-collection__item--selected' : '',
                    ].filter(Boolean).join(' ')}
                    onClick={onSelect}
                    onMouseEnter={onPreview}
                    onFocus={onPreview}
                    aria-label={entry.unlocked ? entry.label : 'Locked card'}
                >
                    <CardChip
                        definitionId={entry.id}
                        size="pile"
                        faceDown={!entry.unlocked}
                        className="card-collection__chip"
                    />
                    <span className="card-collection__name">
                        {entry.unlocked ? entry.label : '???'}
                    </span>
                    <span className="card-collection__tier">{tierLabel(entry.tier)}</span>
                </button>
            )}
            renderDetail={(entry) =>
            {
                if (!entry)
                {
                    return null;
                }

                const tooltip = entry.unlocked ? tooltips.get(entry.id) ?? null : null;

                if (entry.unlocked && tooltip)
                {
                    return (
                        <>
                            <strong>{tooltip.title}</strong>
                            {tooltip.lines.map((line, lineIndex) => (
                                <span key={lineIndex}>{line}</span>
                            ))}
                        </>
                    );
                }

                return (
                    <>
                        <strong>Unknown signal</strong>
                        <span>Acquire this card in a run to unlock its dossier.</span>
                    </>
                );
            }}
        />
    );
};
