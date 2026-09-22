import {
    getLoopLoot,
    type LoopLootDef,
    type LoopStationCardOffer,
} from '../../game/run/loopRun';

interface LoopHubOverlayProps {
    homeLootIds: readonly string[];
    onWalkLoop: () => void;
    onEnterDungeon: () => void;
    onBackToMenu: () => void;
    onOpenRoads: () => void;
}

/** Home between loop walks — stash loot, choose surface or dungeon. */
export const LoopHubOverlay = ({
    homeLootIds,
    onWalkLoop,
    onEnterDungeon,
    onBackToMenu,
    onOpenRoads,
}: LoopHubOverlayProps) => (
    <div className="puzzle-select">
        <div className="puzzle-select__panel">
            <header className="puzzle-select__header">
                <p className="puzzle-select__eyebrow">Home</p>
                <h1 className="puzzle-select__title">The Road</h1>
                <p className="puzzle-select__tagline">
                    Two boards: a circular <strong>walk map</strong> (this run) and a separate
                    <strong> chain board</strong> that opens only when you fight a station.
                    Loot comes home and buffs the next chain.
                </p>
            </header>

            <section className="kit-select__section">
                <h2 className="kit-select__section-label">Stash ({homeLootIds.length})</h2>
                <ul className="kit-select__kit">
                    {homeLootIds.length === 0 && (
                        <li className="kit-select__empty">Empty — clear a loop to bring loot home.</li>
                    )}
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

            <footer className="kit-select__footer" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <button type="button" className="main-menu__start" onClick={onWalkLoop}>
                    Walk the ring
                </button>
                <button type="button" className="main-menu__start" onClick={onEnterDungeon}>
                    Enter dungeon
                </button>
                <button type="button" className="main-menu__secondary" onClick={onOpenRoads}>
                    Practice roads
                </button>
                <button type="button" className="main-menu__secondary" onClick={onBackToMenu}>
                    Menu
                </button>
            </footer>

            <p className="puzzle-select__tagline" style={{ marginTop: 8 }}>
                Walk map first — chain board only in combat.
            </p>
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

/** After clearing a station — pick a card that unlocks more routing. */
export const LoopStationCardOverlay = ({
    offers,
    onTake,
}: LoopStationCardOverlayProps) => (
    <div className="puzzle-select">
        <div className="puzzle-select__panel">
            <header className="puzzle-select__header">
                <p className="puzzle-select__eyebrow">Station clear</p>
                <h1 className="puzzle-select__title">New card</h1>
                <p className="puzzle-select__tagline">
                    Starter arrows are only right and down. New cards unlock left, up, leaps,
                    and diagonals — more combinations on the chain.
                </p>
            </header>

            <ul className="puzzle-select__list">
                {offers.map((offer) => (
                    <li key={`${offer.definitionId}-${offer.arrow ?? 'any'}`} className="puzzle-select__card">
                        <h2 className="puzzle-select__card-title">{offer.label}</h2>
                        <p className="puzzle-select__card-intro">
                            {offer.blurb}
                            {offer.arrow ? ` Arrow: ${offer.arrow}.` : ''}
                        </p>
                        <button
                            type="button"
                            className="puzzle-select__start"
                            onClick={() => onTake(offer)}
                        >
                            Take card
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    </div>
);
