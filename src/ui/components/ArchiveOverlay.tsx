import type { ReactNode } from 'react';
import type { CyberPanelVariant } from './CyberPanel';
import { ModalShell } from './CyberPanel';
import { useArchiveFilter, type ArchiveFilter, type ArchiveUnlockEntry } from '../hooks/useArchiveFilter';

export interface ArchiveFilterLabels {
    unlocked: string;
    locked: string;
}

export interface ArchiveOverlayProps<T extends ArchiveUnlockEntry> {
    onClose: () => void;
    ariaLabel: string;
    eyebrow: string;
    title: string;
    progressSuffix: string;
    filterAriaLabel: string;
    filterLabels: ArchiveFilterLabels;
    emptyDetailHint: string;
    variant: CyberPanelVariant;
    rootClassName: string;
    gridClassName?: string;
    detailClassName?: string;
    entries: readonly T[];
    progress: { unlocked: number; total: number };
    renderItem: (entry: T, ctx: { selected: boolean; onSelect: () => void }) => ReactNode;
    renderDetail: (entry: T | null) => ReactNode;
}

export const ArchiveOverlay = <T extends ArchiveUnlockEntry>({
    onClose,
    ariaLabel,
    eyebrow,
    title,
    progressSuffix,
    filterAriaLabel,
    filterLabels,
    emptyDetailHint,
    variant,
    rootClassName,
    gridClassName = '',
    detailClassName = '',
    entries,
    progress,
    renderItem,
    renderDetail,
}: ArchiveOverlayProps<T>) =>
{
    const {
        filter,
        selectedId,
        visible,
        selected,
        close,
        selectFilter,
        selectEntry,
    } = useArchiveFilter(entries, onClose);

    const filterButtonLabel = (id: ArchiveFilter): string =>
    {
        if (id === 'all')
        {
            return 'All';
        }

        return id === 'unlocked' ? filterLabels.unlocked : filterLabels.locked;
    };

    return (
        <ModalShell
            variant={variant}
            rootClassName={`card-collection ${rootClassName}`.trim()}
            panelClassName="card-collection__panel"
            onBackdropClick={close}
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
                    {progress.unlocked}/{progress.total} {progressSuffix}
                </p>
            </header>

            <div className="card-collection__filters" role="tablist" aria-label={filterAriaLabel}>
                {([ 'all', 'unlocked', 'locked' ] as const).map((id) => (
                    <button
                        key={id}
                        type="button"
                        role="tab"
                        aria-selected={filter === id}
                        className={`card-collection__filter${filter === id ? ' card-collection__filter--active' : ''}`}
                        onClick={() => selectFilter(id)}
                    >
                        {filterButtonLabel(id)}
                    </button>
                ))}
            </div>

            <div className={`card-collection__grid ${gridClassName}`.trim()}>
                {visible.map((entry) => renderItem(entry, {
                    selected: selectedId === entry.id,
                    onSelect: () => selectEntry(entry),
                }))}
            </div>

            <div className={`card-collection__detail ${detailClassName}`.trim()} role="status">
                {selected ? renderDetail(selected) : (
                    <span>{emptyDetailHint}</span>
                )}
            </div>

            <button type="button" className="card-collection__close" onClick={close}>
                Close
            </button>
        </ModalShell>
    );
};
