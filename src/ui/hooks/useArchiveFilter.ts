import { useEffect, useMemo, useState } from 'react';
import { emitRunSfx } from '../../game/audio/emitRunSfx';

export type ArchiveFilter = 'all' | 'unlocked' | 'locked';

export interface ArchiveUnlockEntry {
    id: string;
    unlocked: boolean;
}

export const useArchiveFilter = <T extends ArchiveUnlockEntry>(
    entries: readonly T[],
    onClose: () => void,
) =>
{
    const [ filter, setFilter ] = useState<ArchiveFilter>('all');
    const [ selectedId, setSelectedId ] = useState<string | null>(null);

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

    const selectFilter = (id: ArchiveFilter): void =>
    {
        if (id === filter)
        {
            return;
        }

        emitRunSfx('ui-click', { volume: 0.62, rate: 1.08 });
        setFilter(id);
    };

    const selectEntry = (entry: T): void =>
    {
        emitRunSfx('ui-select', {
            volume: entry.unlocked ? 0.78 : 0.55,
            rate: entry.unlocked ? 1 : 0.82,
        });
        setSelectedId(entry.id);
    };

    /** Quiet focus for hover — drives the side dossier without a floating tooltip. */
    const previewEntry = (entry: T): void =>
    {
        setSelectedId(entry.id);
    };

    return {
        filter,
        selectedId,
        visible,
        selected,
        close,
        selectFilter,
        selectEntry,
        previewEntry,
    };
};
