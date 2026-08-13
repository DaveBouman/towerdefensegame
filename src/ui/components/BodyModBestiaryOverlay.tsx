import { useMemo } from 'react';
import {
    getBodyModBestiaryEntries,
    getBodyModBestiaryProgress,
    bodyModTierLabel,
    type BestiaryBodyModEntry,
} from '../../game/run/bodyModBestiary';
import { ArchiveOverlay } from './ArchiveOverlay';

interface BodyModBestiaryOverlayProps {
    onClose: () => void;
}

export const BodyModBestiaryOverlay = ({ onClose }: BodyModBestiaryOverlayProps) =>
{
    const progress = useMemo(() => getBodyModBestiaryProgress(), []);
    const entries = useMemo(() => getBodyModBestiaryEntries(), []);

    return (
        <ArchiveOverlay
            onClose={onClose}
            ariaLabel="Body mod archive"
            eyebrow="Chrome archive"
            title="Body mods"
            progressSuffix="logged"
            filterAriaLabel="Body mod filter"
            filterLabels={{ unlocked: 'Logged', locked: 'Unknown' }}
            emptyDetailHint="Select a body mod to inspect its dossier."
            variant="cyan"
            rootClassName="body-mod-bestiary"
            gridClassName="body-mod-bestiary__grid"
            detailClassName="body-mod-bestiary__detail"
            entries={entries}
            progress={progress}
            renderItem={(entry, { selected, onSelect }) => (
                <button
                    key={entry.id}
                    type="button"
                    className={[
                        'card-collection__item',
                        'body-mod-bestiary__item',
                        entry.unlocked ? '' : 'card-collection__item--locked',
                        selected ? 'card-collection__item--selected' : '',
                    ].filter(Boolean).join(' ')}
                    onClick={onSelect}
                    aria-label={entry.unlocked ? entry.label : 'Unknown body mod'}
                    style={entry.unlocked
                        ? { ['--body-mod-accent' as string]: entry.accentCss }
                        : undefined}
                >
                    <span className="body-mod-bestiary__glyph" aria-hidden="true">
                        {entry.unlocked ? entry.glyph : '?'}
                    </span>
                    <span className="card-collection__name">
                        {entry.unlocked ? entry.label : '???'}
                    </span>
                    <span className="card-collection__tier">
                        {bodyModTierLabel(entry.tier)}
                    </span>
                    <span className="card-collection__tooltip" role="tooltip">
                        {entry.unlocked ? (
                            <>
                                <span className="card-collection__tooltip-title">
                                    {entry.label}
                                </span>
                                <span className="card-collection__tooltip-line">
                                    {entry.summary}
                                </span>
                            </>
                        ) : (
                            <>
                                <span className="card-collection__tooltip-title">
                                    Unknown body mod
                                </span>
                                <span className="card-collection__tooltip-line">
                                    Install this body mod during a run to log it.
                                </span>
                            </>
                        )}
                    </span>
                </button>
            )}
            renderDetail={(entry) => renderBodyModDetail(entry)}
        />
    );
};

const renderBodyModDetail = (entry: BestiaryBodyModEntry | null) =>
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
                <span>{entry.blurb}</span>
                {entry.dossierLines.map((line) => (
                    <span key={line}>{line}</span>
                ))}
            </>
        );
    }

    return (
        <>
            <strong>Unknown body mod</strong>
            <span>Install this body mod during a run to log its dossier.</span>
        </>
    );
};
