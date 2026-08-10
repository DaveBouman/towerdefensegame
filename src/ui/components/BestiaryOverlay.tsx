import { useEffect, useMemo, useState } from 'react';
import { emitRunSfx } from '../../game/audio/emitRunSfx';
import {
    bestiaryRoleLabel,
    getBestiaryEntries,
    getBestiaryProgress,
    type BestiaryEnemyEntry,
} from '../../game/run/enemyBestiary';
import { CyberPanelChrome } from './CyberPanel';

type BestiaryFilter = 'all' | 'unlocked' | 'locked';

interface BestiaryOverlayProps {
    onClose: () => void;
}

export const BestiaryOverlay = ({ onClose }: BestiaryOverlayProps) =>
{
    const [ filter, setFilter ] = useState<BestiaryFilter>('all');
    const [ selectedId, setSelectedId ] = useState<string | null>(null);
    const progress = useMemo(() => getBestiaryProgress(), []);
    const entries = useMemo(() => getBestiaryEntries(), []);

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

    const selectFilter = (id: BestiaryFilter): void =>
    {
        if (id === filter)
        {
            return;
        }

        emitRunSfx('ui-click', { volume: 0.62, rate: 1.08 });
        setFilter(id);
    };

    const selectEnemy = (entry: BestiaryEnemyEntry): void =>
    {
        emitRunSfx('ui-select', {
            volume: entry.unlocked ? 0.78 : 0.55,
            rate: entry.unlocked ? 1 : 0.82,
        });
        setSelectedId(entry.id);
    };

    return (
        <div
            className="card-collection bestiary"
            role="dialog"
            aria-modal="true"
            aria-label="Bestiary"
        >
            <div
                className="cp-overlay__backdrop"
                aria-hidden="true"
                onClick={close}
            />
            <div
                className="card-collection__panel cp-panel cp-panel--magenta"
                onClick={(event) => event.stopPropagation()}
                onWheel={(event) => event.stopPropagation()}
            >
                <CyberPanelChrome variant="magenta" />
                <header className="card-collection__header">
                    <div>
                        <p className="card-collection__eyebrow">Hostile archive</p>
                        <h1 className="card-collection__title">Bestiary</h1>
                    </div>
                    <p className="card-collection__progress" aria-live="polite">
                        {progress.unlocked}/{progress.total} logged
                    </p>
                </header>

                <div className="card-collection__filters" role="tablist" aria-label="Bestiary filter">
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

                <div className="card-collection__grid bestiary__grid">
                    {visible.map((entry) => (
                        <button
                            key={entry.id}
                            type="button"
                            className={[
                                'card-collection__item',
                                'bestiary__item',
                                entry.unlocked ? '' : 'card-collection__item--locked',
                                selectedId === entry.id ? 'card-collection__item--selected' : '',
                            ].filter(Boolean).join(' ')}
                            onClick={() => selectEnemy(entry)}
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
                                            Unknown hostile
                                        </span>
                                        <span className="card-collection__tooltip-line">
                                            Encounter this enemy in a run to log its dossier.
                                        </span>
                                    </>
                                )}
                            </span>
                        </button>
                    ))}
                </div>

                <div className="card-collection__detail bestiary__detail" role="status">
                    {selected?.unlocked ? (
                        <>
                            <strong style={{ color: selected.labelColor }}>{selected.label}</strong>
                            <span>{selected.summary}</span>
                            {selected.dossierLines.map((line) => (
                                <span key={line}>{line}</span>
                            ))}
                        </>
                    ) : selected ? (
                        <>
                            <strong>Unknown hostile</strong>
                            <span>Encounter this enemy in a run to log its dossier.</span>
                        </>
                    ) : (
                        <span>Select a hostile to inspect its dossier.</span>
                    )}
                </div>

                <button type="button" className="card-collection__close" onClick={close}>
                    Close
                </button>
            </div>
        </div>
    );
};
