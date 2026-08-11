import { useEffect, useMemo, useState } from 'react';
import { emitRunSfx } from '../../game/audio/emitRunSfx';
import { createCardInstance } from '../../game/cardGame/domain/createCardInstance';
import { resolveCardTooltip } from '../../game/cardGame/presentation/tooltips/cardTooltipRegistry';
import {
    getCollectionEntries,
    getCollectionProgress,
    type CollectionCardEntry,
} from '../../game/run/cardCollection';
import { CardChip } from './CardChip';
import { CyberPanelChrome } from './CyberPanel';

type CollectionFilter = 'all' | 'unlocked' | 'locked';

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
    const [ filter, setFilter ] = useState<CollectionFilter>('all');
    const [ selectedId, setSelectedId ] = useState<string | null>(null);
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

    const visible = useMemo(() =>
    {
        if (filter === 'unlocked')
        {
            return entries.filter((entry) => entry.unlocked);
        }

        if (filter === 'locked')
        {
            return entries.filter((entry) => !entry.unlocked);
        }

        return entries;
    }, [ entries, filter ]);

    const selected = selectedId
        ? entries.find((entry) => entry.id === selectedId) ?? null
        : null;

    const selectedTooltip = selected?.unlocked
        ? tooltips.get(selected.id) ?? null
        : null;

    useEffect(() =>
    {
        emitRunSfx('ui-select', { volume: 0.72, rate: 1.05 });
    }, []);

    const close = (): void =>
    {
        emitRunSfx('ui-click', { volume: 0.7, rate: 0.92 });
        onClose();
    };

    const selectFilter = (id: CollectionFilter): void =>
    {
        if (id === filter)
        {
            return;
        }

        emitRunSfx('ui-click', { volume: 0.62, rate: 1.08 });
        setFilter(id);
    };

    const selectCard = (entry: CollectionCardEntry): void =>
    {
        emitRunSfx('ui-select', {
            volume: entry.unlocked ? 0.78 : 0.55,
            rate: entry.unlocked ? 1 : 0.82,
        });
        setSelectedId(entry.id);
    };

    return (
        <div
            className="card-collection"
            role="dialog"
            aria-modal="true"
            aria-label="Card index"
        >
            <div
                className="cp-overlay__backdrop"
                aria-hidden="true"
                onClick={close}
            />
            <div
                className="card-collection__panel cp-panel cp-panel--cyan"
                onClick={(event) => event.stopPropagation()}
                onWheel={(event) => event.stopPropagation()}
            >
                <CyberPanelChrome variant="cyan" />
                <header className="card-collection__header">
                    <div>
                        <p className="card-collection__eyebrow">Data archive</p>
                        <h1 className="card-collection__title">Card index</h1>
                    </div>
                    <p className="card-collection__progress" aria-live="polite">
                        {progress.unlocked}/{progress.total} unlocked
                    </p>
                </header>

                <div className="card-collection__filters" role="tablist" aria-label="Collection filter">
                    {([ 'all', 'unlocked', 'locked' ] as const).map((id) => (
                        <button
                            key={id}
                            type="button"
                            role="tab"
                            aria-selected={filter === id}
                            className={`card-collection__filter${filter === id ? ' card-collection__filter--active' : ''}`}
                            onClick={() => selectFilter(id)}
                        >
                            {id === 'all' ? 'All' : id === 'unlocked' ? 'Unlocked' : 'Locked'}
                        </button>
                    ))}
                </div>

                <div className="card-collection__grid">
                    {visible.map((entry) =>
                    {
                        const tooltip = entry.unlocked ? tooltips.get(entry.id) ?? null : null;

                        return (
                            <button
                                key={entry.id}
                                type="button"
                                className={[
                                    'card-collection__item',
                                    entry.unlocked ? '' : 'card-collection__item--locked',
                                    selectedId === entry.id ? 'card-collection__item--selected' : '',
                                ].filter(Boolean).join(' ')}
                                onClick={() => selectCard(entry)}
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
                                <span className="card-collection__tooltip" role="tooltip">
                                    {tooltip ? (
                                        <>
                                            <span className="card-collection__tooltip-title">
                                                {tooltip.title}
                                            </span>
                                            {tooltip.lines.map((line, lineIndex) => (
                                                <span
                                                    key={`${entry.id}-${lineIndex}`}
                                                    className="card-collection__tooltip-line"
                                                >
                                                    {line}
                                                </span>
                                            ))}
                                        </>
                                    ) : (
                                        <>
                                            <span className="card-collection__tooltip-title">
                                                Unknown signal
                                            </span>
                                            <span className="card-collection__tooltip-line">
                                                Acquire this card in a run to unlock its dossier.
                                            </span>
                                        </>
                                    )}
                                </span>
                            </button>
                        );
                    })}
                </div>

                <div className="card-collection__detail" role="status">
                    {selected?.unlocked && selectedTooltip ? (
                        <>
                            <strong>{selectedTooltip.title}</strong>
                            {selectedTooltip.lines.map((line, lineIndex) => (
                                <span key={lineIndex}>{line}</span>
                            ))}
                        </>
                    ) : selected ? (
                        <>
                            <strong>Unknown signal</strong>
                            <span>Acquire this card in a run to unlock its dossier.</span>
                        </>
                    ) : (
                        <span>Hover or select a card to inspect it.</span>
                    )}
                </div>

                <button type="button" className="card-collection__close" onClick={close}>
                    Close
                </button>
            </div>
        </div>
    );
};
