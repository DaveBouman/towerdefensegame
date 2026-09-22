import { useMemo, useState } from 'react';
import { getCardDefinitionOrThrow } from '../../game/cardGame/config/cardRegistry';
import {
    canAddToKit,
    countKitCopies,
    getSkirmishEncounter,
    SKIRMISH_KIT_POOL,
} from '../../game/run/skirmishEncounters';

interface KitSelectOverlayProps {
    encounterId: string;
    onConfirm: (definitionIds: string[]) => void;
    onBack: () => void;
}

/** Backpack-style prep: pack a kit, then fight. */
export const KitSelectOverlay = ({
    encounterId,
    onConfirm,
    onBack,
}: KitSelectOverlayProps) =>
{
    const encounter = useMemo(() => getSkirmishEncounter(encounterId), [ encounterId ]);
    const [ kit, setKit ] = useState<string[]>([]);

    const addCard = (definitionId: string): void =>
    {
        setKit((prev) =>
        {
            if (!canAddToKit(prev, definitionId, encounter.kitSize))
            {
                return prev;
            }

            return [ ...prev, definitionId ];
        });
    };

    const removeAt = (index: number): void =>
    {
        setKit((prev) => prev.filter((_id, i) => i !== index));
    };

    const ready = kit.length === encounter.kitSize;

    return (
        <div className="kit-select">
            <div className="kit-select__panel">
                <header className="kit-select__header">
                    <p className="kit-select__eyebrow">Pack your kit</p>
                    <h1 className="kit-select__title">{encounter.title}</h1>
                    <p className="kit-select__tagline">
                        Choose {encounter.kitSize} cards. Then you lay chains and fight until
                        someone is defeated — the enemy attacks back.
                    </p>
                    <p className="kit-select__count">
                        Packed {kit.length} / {encounter.kitSize}
                    </p>
                </header>

                <section className="kit-select__section">
                    <h2 className="kit-select__section-label">Your kit</h2>
                    <ul className="kit-select__kit">
                        {kit.length === 0 && (
                            <li className="kit-select__empty">Tap cards below to pack them.</li>
                        )}
                        {kit.map((definitionId, index) =>
                        {
                            const card = getCardDefinitionOrThrow(definitionId);

                            return (
                                <li key={`${definitionId}-${index}`}>
                                    <button
                                        type="button"
                                        className="kit-select__chip kit-select__chip--packed"
                                        onClick={() => removeAt(index)}
                                    >
                                        {card.label}
                                        <span className="kit-select__chip-x" aria-hidden>✕</span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </section>

                <section className="kit-select__section">
                    <h2 className="kit-select__section-label">Available</h2>
                    <ul className="kit-select__pool">
                        {SKIRMISH_KIT_POOL.map((entry) =>
                        {
                            const card = getCardDefinitionOrThrow(entry.definitionId);
                            const used = countKitCopies(kit, entry.definitionId);
                            const disabled = !canAddToKit(kit, entry.definitionId, encounter.kitSize);

                            return (
                                <li key={entry.definitionId}>
                                    <button
                                        type="button"
                                        className="kit-select__chip"
                                        disabled={disabled}
                                        onClick={() => addCard(entry.definitionId)}
                                    >
                                        {card.label}
                                        <span className="kit-select__chip-stock">
                                            {used}/{entry.maxCopies}
                                        </span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </section>

                <footer className="kit-select__footer">
                    <button type="button" className="main-menu__secondary" onClick={onBack}>
                        Back
                    </button>
                    <button
                        type="button"
                        className="main-menu__start"
                        disabled={!ready}
                        onClick={() => onConfirm(kit)}
                    >
                        Fight
                    </button>
                </footer>
            </div>
        </div>
    );
};
