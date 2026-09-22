import {
    formatPuzzleGoal,
    listGalleryPuzzles,
} from '../../game/run/runPuzzles';

interface PuzzleSelectOverlayProps {
    onSelect: (puzzleId: string) => void;
    onBackToMenu: () => void;
    onLegacyRun: () => void;
}

/** Road gallery — painted Loop Hero paths on the 5×5. */
export const PuzzleSelectOverlay = ({
    onSelect,
    onBackToMenu,
    onLegacyRun,
}: PuzzleSelectOverlayProps) => (
    <div className="puzzle-select">
        <div className="puzzle-select__panel">
            <header className="puzzle-select__header">
                <p className="puzzle-select__eyebrow">The Road</p>
                <h1 className="puzzle-select__title">Choose a road</h1>
                <p className="puzzle-select__tagline">
                    Amber tiles are the road. Pack your kit on them, walk the chain along the paint.
                </p>
            </header>

            <ul className="puzzle-select__list">
                {listGalleryPuzzles().map((puzzle) => (
                    <li key={puzzle.id} className="puzzle-select__card">
                        <div className="puzzle-select__card-top">
                            <div className="puzzle-select__card-copy">
                                <h2 className="puzzle-select__card-title">{puzzle.title}</h2>
                                <p className="puzzle-select__card-meta">
                                    {puzzle.cards.length} cards
                                    {puzzle.road ? ` · ${puzzle.road.length}-tile road` : ''}
                                </p>
                            </div>
                        </div>
                        <p className="puzzle-select__card-intro">{puzzle.intro}</p>
                        <p className="puzzle-select__card-meta">{formatPuzzleGoal(puzzle.win)}</p>
                        <button
                            type="button"
                            className="puzzle-select__start"
                            onClick={() => onSelect(puzzle.id)}
                        >
                            Walk road
                        </button>
                    </li>
                ))}
            </ul>

            <footer className="puzzle-select__footer">
                <button type="button" className="main-menu__secondary" onClick={onBackToMenu}>
                    Back to menu
                </button>
                <button type="button" className="main-menu__secondary" onClick={onLegacyRun}>
                    Legacy run
                </button>
            </footer>
        </div>
    </div>
);
