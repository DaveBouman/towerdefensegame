import { useMemo } from 'react';
import {
    bestiaryRoleLabel,
    getBestiaryEntries,
    getBestiaryProgress,
    type BestiaryEnemyEntry,
} from '../../game/run/enemyBestiary';
import { ArchiveOverlay } from './ArchiveOverlay';

interface BestiaryOverlayProps {
    onClose: () => void;
}

export const BestiaryOverlay = ({ onClose }: BestiaryOverlayProps) =>
{
    const progress = useMemo(() => getBestiaryProgress(), []);
    const entries = useMemo(() => getBestiaryEntries(), []);

    return (
        <ArchiveOverlay
            onClose={onClose}
            ariaLabel="Bestiary"
            eyebrow="Hostile archive"
            title="Bestiary"
            progressSuffix="logged"
            filterAriaLabel="Bestiary filter"
            filterLabels={{ unlocked: 'Logged', locked: 'Unknown' }}
            emptyDetailHint="Select a hostile to inspect its dossier."
            variant="magenta"
            rootClassName="bestiary"
            gridClassName="bestiary__grid"
            detailClassName="bestiary__detail"
            entries={entries}
            progress={progress}
            renderItem={(entry, { selected, onSelect, onPreview }) => (
                <button
                    key={entry.id}
                    type="button"
                    className={[
                        'card-collection__item',
                        'bestiary__item',
                        entry.unlocked ? '' : 'card-collection__item--locked',
                        selected ? 'card-collection__item--selected' : '',
                    ].filter(Boolean).join(' ')}
                    onClick={onSelect}
                    onMouseEnter={onPreview}
                    onFocus={onPreview}
                    aria-label={entry.unlocked ? entry.label : 'Unknown hostile'}
                    style={entry.unlocked
                        ? { ['--bestiary-accent' as string]: entry.accentCss }
                        : undefined}
                >
                    <span className="bestiary__portrait" aria-hidden="true">
                        {entry.unlocked && entry.portraitUrl ? (
                            <img
                                src={entry.portraitUrl}
                                alt=""
                                className="bestiary__portrait-img"
                            />
                        ) : (
                            <span className="bestiary__portrait-unknown">?</span>
                        )}
                    </span>
                    <span className="card-collection__name">
                        {entry.unlocked ? entry.label : '???'}
                    </span>
                    <span className="card-collection__tier">
                        {bestiaryRoleLabel(entry.role)}
                    </span>
                </button>
            )}
            renderDetail={(entry) => renderEnemyDetail(entry)}
        />
    );
};

const renderEnemyDetail = (entry: BestiaryEnemyEntry | null) =>
{
    if (!entry)
    {
        return null;
    }

    if (entry.unlocked)
    {
        return (
            <>
                <strong style={{ color: entry.labelColor }}>{entry.label}</strong>
                <span>{entry.summary}</span>
                {entry.dossierLines.map((line) => (
                    <span key={line}>{line}</span>
                ))}
            </>
        );
    }

    return (
        <>
            <strong>Unknown hostile</strong>
            <span>Encounter this enemy in a run to log its dossier.</span>
        </>
    );
};
