import { useEffect, useMemo, useState } from 'react';
import type { CardTier } from '../../game/cardGame/config/cardRegistry';
import { getCardDefinitionOrThrow } from '../../game/cardGame/config/cardRegistry';
import type { CardDirection } from '../../game/cardGame/domain/cardDirections';
import { createCardInstance } from '../../game/cardGame/domain/createCardInstance';
import { resolveCardTooltip } from '../../game/cardGame/presentation/tooltips/cardTooltipRegistry';
import { CardChip } from './CardChip';
import { ModalShell, type CyberPanelVariant } from './CyberPanel';

export interface CardInspectEntry {
    id: string;
    definitionId: string;
    label: string;
    count?: number;
    arrow?: CardDirection;
    loopArrow?: CardDirection;
    tier?: CardTier;
}

interface CardInspectOverlayProps {
    onClose: () => void;
    ariaLabel: string;
    eyebrow: string;
    title: string;
    /** Shown in the header where collection progress normally lives. */
    countLabel: string;
    entries: readonly CardInspectEntry[];
    emptyMessage?: string;
    detailHint?: string;
    subtitle?: string;
    variant?: CyberPanelVariant;
    rootClassName?: string;
}

const tierLabel = (tier: CardTier | undefined): string =>
{
    if (tier === 1)
    {
        return 'Common';
    }

    if (tier === 2)
    {
        return 'Uncommon';
    }

    if (tier === 3)
    {
        return 'Rare';
    }

    return '';
};

/** Card index-style inspector — grid + dossier, no unlock filters. */
export const CardInspectOverlay = ({
    onClose,
    ariaLabel,
    eyebrow,
    title,
    countLabel,
    entries,
    emptyMessage = 'No cards to show.',
    detailHint = 'Select a card to inspect its dossier.',
    subtitle,
    variant = 'cyan',
    rootClassName = '',
}: CardInspectOverlayProps) =>
{
    const [ selectedId, setSelectedId ] = useState<string | null>(null);

    useEffect(() =>
    {
        setSelectedId(null);
    }, [ entries ]);

    useEffect(() =>
    {
        const onKey = (event: KeyboardEvent): void =>
        {
            if (event.key === 'Escape')
            {
                onClose();
            }
        };

        window.addEventListener('keydown', onKey);

        return () => window.removeEventListener('keydown', onKey);
    }, [ onClose ]);

    const tooltips = useMemo(() =>
    {
        const map = new Map<string, ReturnType<typeof resolveCardTooltip>>();

        for (const entry of entries)
        {
            map.set(entry.id, resolveCardTooltip(createCardInstance(
                entry.definitionId,
                entry.arrow,
                'player',
                entry.loopArrow,
            )));
        }

        return map;
    }, [ entries ]);

    const selected = selectedId
        ? entries.find((entry) => entry.id === selectedId) ?? null
        : null;
    const selectedTooltip = selected ? tooltips.get(selected.id) ?? null : null;

    return (
        <ModalShell
            variant={variant}
            rootClassName={`card-collection card-inspect ${rootClassName}`.trim()}
            panelClassName="card-collection__panel"
            onBackdropClick={onClose}
            role="dialog"
            ariaModal
            ariaLabel={ariaLabel}
        >
            <header className="card-collection__header">
                <div>
                    <p className="card-collection__eyebrow">{eyebrow}</p>
                    <h1 className="card-collection__title">{title}</h1>
                </div>
                <p className="card-collection__progress" aria-live="polite">
                    {countLabel}
                </p>
            </header>

            {subtitle && (
                <p className="card-inspect__subtitle">{subtitle}</p>
            )}

            {entries.length === 0 ? (
                <p className="card-inspect__empty">{emptyMessage}</p>
            ) : (
                <div className="card-collection__body">
                    <div className="card-collection__grid">
                        {entries.map((entry) =>
                        {
                            const resolvedTier = entry.tier
                                ?? getCardDefinitionOrThrow(entry.definitionId).tier;

                            return (
                                <button
                                    key={entry.id}
                                    type="button"
                                    className={[
                                        'card-collection__item',
                                        selectedId === entry.id ? 'card-collection__item--selected' : '',
                                    ].filter(Boolean).join(' ')}
                                    onClick={() => setSelectedId(entry.id)}
                                    onMouseEnter={() => setSelectedId(entry.id)}
                                    onFocus={() => setSelectedId(entry.id)}
                                    aria-label={entry.label}
                                >
                                    <CardChip
                                        definitionId={entry.definitionId}
                                        label={entry.label}
                                        arrow={entry.arrow}
                                        loopArrow={entry.loopArrow}
                                        countBadge={entry.count}
                                        size="pile"
                                        className="card-collection__chip"
                                    />
                                    <span className="card-collection__name">{entry.label}</span>
                                    <span className="card-collection__tier">{tierLabel(resolvedTier)}</span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="card-collection__detail" role="status">
                        {selectedTooltip ? (
                            <>
                                <strong>{selectedTooltip.title}</strong>
                                {selectedTooltip.lines.map((line, lineIndex) => (
                                    <span key={lineIndex}>{line}</span>
                                ))}
                            </>
                        ) : (
                            <span>{detailHint}</span>
                        )}
                    </div>
                </div>
            )}

            <button type="button" className="card-collection__close" onClick={onClose}>
                Close
            </button>
        </ModalShell>
    );
};
