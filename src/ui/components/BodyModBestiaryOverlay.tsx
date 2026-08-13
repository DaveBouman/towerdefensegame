import { useEffect, useMemo, useState } from 'react';
import { emitRunSfx } from '../../game/audio/emitRunSfx';
import {
    getBodyModBestiaryEntries,
    getBodyModBestiaryProgress,
    bodyModTierLabel,
    type BestiaryBodyModEntry,
} from '../../game/run/bodyModBestiary';
import { CyberPanelChrome } from './CyberPanel';

type BodyModFilter = 'all' | 'unlocked' | 'locked';

interface BodyModBestiaryOverlayProps {
    onClose: () => void;
}

export const BodyModBestiaryOverlay = ({ onClose }: BodyModBestiaryOverlayProps) =>
{
    const [ filter, setFilter ] = useState<BodyModFilter>('all');
    const [ selectedId, setSelectedId ] = useState<string | null>(null);
    const progress = useMemo(() => getBodyModBestiaryProgress(), []);
    const entries = useMemo(() => getBodyModBestiaryEntries(), []);

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

    useEffect(() =>
    {
        emitRunSfx('ui-select', { volume: 0.72, rate: 0.98 });
    }, []);

    const close = (): void =>
    {
        emitRunSfx('ui-click', { volume: 0.7, rate: 0.92 });
        onClose();
    };

    const selectFilter = (id: BodyModFilter): void =>
    {
        if (id === filter)
        {
            return;
        }

        emitRunSfx('ui-click', { volume: 0.62, rate: 1.08 });
        setFilter(id);
    };

    const selectBodyMod = (entry: BestiaryBodyModEntry): void =>
    {
        emitRunSfx('ui-select', {
            volume: entry.unlocked ? 0.78 : 0.55,
            rate: entry.unlocked ? 1 : 0.82,
        });
        setSelectedId(entry.id);
    };

    return (
        <div
            className="card-collection body-mod-bestiary"
            role="dialog"
            aria-modal="true"
            aria-label="Body mod archive"
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
                        <p className="card-collection__eyebrow">Chrome archive</p>
                        <h1 className="card-collection__title">Body mods</h1>
                    </div>
                    <p className="card-collection__progress" aria-live="polite">
                        {progress.unlocked}/{progress.total} logged
                    </p>
                </header>

                <div className="card-collection__filters" role="tablist" aria-label="Body mod filter">
                    {([ 'all', 'unlocked', 'locked' ] as const).map((id) => (
                        <button
                            key={id}
                            type="button"
                            role="tab"
                            aria-selected={filter === id}
                            className={`card-collection__filter${filter === id ? ' card-collection__filter--active' : ''}`}
                            onClick={() => selectFilter(id)}
                        >
                            {id === 'all' ? 'All' : id === 'unlocked' ? 'Logged' : 'Unknown'}
                        </button>
                    ))}
                </div>

                <div className="card-collection__grid body-mod-bestiary__grid">
                    {visible.map((entry) => (
                        <button
                            key={entry.id}
                            type="button"
                            className={[
                                'card-collection__item',
                                'body-mod-bestiary__item',
                                entry.unlocked ? '' : 'card-collection__item--locked',
                                selectedId === entry.id ? 'card-collection__item--selected' : '',
                            ].filter(Boolean).join(' ')}
                            onClick={() => selectBodyMod(entry)}
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
                    ))}
                </div>

                <div className="card-collection__detail body-mod-bestiary__detail" role="status">
                    {selected?.unlocked ? (
                        <>
                            <strong style={{ color: selected.labelColor }}>{selected.label}</strong>
                            <span>{selected.summary}</span>
                            <span>{selected.blurb}</span>
                            {selected.dossierLines.map((line) => (
                                <span key={line}>{line}</span>
                            ))}
                        </>
                    ) : selected ? (
                        <>
                            <strong>Unknown body mod</strong>
                            <span>Install this body mod during a run to log its dossier.</span>
                        </>
                    ) : (
                        <span>Select a body mod to inspect its dossier.</span>
                    )}
                </div>

                <button type="button" className="card-collection__close" onClick={close}>
                    Close
                </button>
            </div>
        </div>
    );
};
