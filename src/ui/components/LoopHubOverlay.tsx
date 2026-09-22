import { useState } from 'react';
import {
    getLoopLoot,
    type LoopLootDef,
    type LoopStationCardOffer,
} from '../../game/run/loopRun';
import { CardDirectionPicker } from './CardDirectionPicker';

interface LoopHubOverlayProps {
    homeLootIds: readonly string[];
    onWalkLoop: () => void;
}

/** Home between loop walks — stash loot, walk the ring. */
export const LoopHubOverlay = ({
    homeLootIds,
    onWalkLoop,
}: LoopHubOverlayProps) => (
    <div className="puzzle-select">
        <div className="puzzle-select__panel">
            <header className="puzzle-select__header">
                <p className="puzzle-select__eyebrow">Home</p>
                <h1 className="puzzle-select__title">The Road</h1>
                <p className="puzzle-select__tagline">
                    Pack your chain, walk the ring, clear stations.
                </p>
            </header>

            {homeLootIds.length > 0 && (
                <section className="kit-select__section">
                    <h2 className="kit-select__section-label">Stash ({homeLootIds.length})</h2>
                    <ul className="kit-select__kit">
                        {homeLootIds.map((id, index) =>
                        {
                            const loot = getLoopLoot(id);

                            return (
                                <li key={`${id}-${index}`}>
                                    <span className="kit-select__chip kit-select__chip--packed">
                                        {loot.label}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                </section>
            )}

            <footer className="kit-select__footer" style={{ gridTemplateColumns: '1fr' }}>
                <button type="button" className="main-menu__start" onClick={onWalkLoop}>
                    Walk the ring
                </button>
            </footer>
        </div>
    </div>
);

interface LoopLootOverlayProps {
    offers: readonly LoopLootDef[];
    dungeon: boolean;
    onTakeHome: (lootId: string) => void;
}

export const LoopLootOverlay = ({
    offers,
    dungeon,
    onTakeHome,
}: LoopLootOverlayProps) => (
    <div className="puzzle-select">
        <div className="puzzle-select__panel">
            <header className="puzzle-select__header">
                <p className="puzzle-select__eyebrow">{dungeon ? 'Dungeon clear' : 'Loop clear'}</p>
                <h1 className="puzzle-select__title">Take loot home</h1>
                <p className="puzzle-select__tagline">
                    Pick one. It buffs your kit or installs a chain effect for future walks.
                </p>
            </header>

            <ul className="puzzle-select__list">
                {offers.map((loot) => (
                    <li key={loot.id} className="puzzle-select__card">
                        <h2 className="puzzle-select__card-title">{loot.label}</h2>
                        <p className="puzzle-select__card-intro">{loot.blurb}</p>
                        <button
                            type="button"
                            className="puzzle-select__start"
                            onClick={() => onTakeHome(loot.id)}
                        >
                            Take home
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    </div>
);

interface LoopStationCardOverlayProps {
    offers: readonly LoopStationCardOffer[];
    onTake: (offer: LoopStationCardOffer) => void;
}

/** After clearing a station — pick a card, then choose its arrow. */
export const LoopStationCardOverlay = ({
    offers,
    onTake,
}: LoopStationCardOverlayProps) =>
{
    const [ picking, setPicking ] = useState<LoopStationCardOffer | null>(null);

    if (picking)
    {
        return (
            <div className="puzzle-select">
                <div className="puzzle-select__panel">
                    <header className="puzzle-select__header">
                        <p className="puzzle-select__eyebrow">Station clear</p>
                        <h1 className="puzzle-select__title">{picking.label}</h1>
                        <p className="puzzle-select__tagline">
                            Choose the chain direction for this card.
                        </p>
                    </header>

                    <CardDirectionPicker
                        definitionId={picking.definitionId}
                        onPick={(arrow) => onTake({ ...picking, arrow })}
                    />

                    <footer className="puzzle-select__footer">
                        <button
                            type="button"
                            className="puzzle-select__back"
                            onClick={() => setPicking(null)}
                        >
                            Back to cards
                        </button>
                    </footer>
                </div>
            </div>
        );
    }

    return (
        <div className="puzzle-select">
            <div className="puzzle-select__panel">
                <header className="puzzle-select__header">
                    <p className="puzzle-select__eyebrow">Station clear</p>
                    <h1 className="puzzle-select__title">New card</h1>
                    <p className="puzzle-select__tagline">
                        Starter arrows are only right and down. Pick a card, then aim its
                        arrow — left, up, leaps, and diagonals unlock more routes.
                    </p>
                </header>

                <ul className="puzzle-select__list">
                    {offers.map((offer) => (
                        <li key={offer.definitionId} className="puzzle-select__card">
                            <h2 className="puzzle-select__card-title">{offer.label}</h2>
                            <p className="puzzle-select__card-intro">{offer.blurb}</p>
                            <button
                                type="button"
                                className="puzzle-select__start"
                                onClick={() => setPicking(offer)}
                            >
                                Choose direction
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};
