import { BOARD_COL_LABELS, BOARD_ROW_LABELS } from '../../../game/board/boardCoordinates';
import { poisonStatusName } from '../../../game/copy/strings';
import { BackButton } from './menuShared';

interface MainMenuHowToPlayProps {
    onBack: () => void;
}

export const MainMenuHowToPlay = ({ onBack }: MainMenuHowToPlayProps) => (
    <>
        <BackButton onClick={onBack} />
        <p className="main-menu__eyebrow">Field manual</p>
        <h2 className="main-menu__screen-title">How to play</h2>
        <div className="main-menu__grid-legend" aria-hidden="true">
            <div className="main-menu__grid-legend-frame">
                <span className="main-menu__grid-legend-corner" />
                {BOARD_COL_LABELS.map((col, colIndex) => (
                    <span
                        key={`col-${col}`}
                        className={`main-menu__grid-legend-axis main-menu__grid-legend-axis--col${colIndex === 0 ? ' main-menu__grid-legend-axis--start' : ''}`}
                    >
                        {col}
                    </span>
                ))}
                {BOARD_ROW_LABELS.map((rowLabel) => (
                    <div key={`row-${rowLabel}`} className="main-menu__grid-legend-row">
                        <span className="main-menu__grid-legend-axis main-menu__grid-legend-axis--row">
                            {rowLabel}
                        </span>
                        {BOARD_COL_LABELS.map((col, colIndex) => (
                            <span
                                key={`${rowLabel}-${col}`}
                                className={`main-menu__grid-legend-cell${colIndex === 0 ? ' main-menu__grid-legend-cell--start' : ''}`}
                            />
                        ))}
                    </div>
                ))}
            </div>
            <p className="main-menu__grid-legend-caption">
                Columns <strong>0–4</strong> across, rows <strong>A–E</strong> down
                (letters stand vertical). Chain start locks to column <strong>0</strong>.
                During an attack the live cell’s letter and number light up.
            </p>
        </div>
        <ol className="main-menu__manual">
            <li>Place cards on the 5×5 grid so their arrows form a chain.</li>
            <li>Click a column-0 tile to set chain start, then press Attack.</li>
            <li>Starter seeds teach combos: Fire alternation, {poisonStatusName()}→Defends, Rupture bleed, Bulwark fortify, Surge overload.</li>
            <li>Echo repeats the previous card; Reroute steers mid-chain.</li>
            <li>Attack and defense cards off the chain still grant small bonuses.</li>
            <li>Each Attack spends energy. After each enemy response they overclock (+attack). When empty, the board clears for a new round.</li>
            <li>Pick map nodes to fight, shop, rest, or jack into signals — HP carries over.</li>
            <li>In multi-enemy fights, click a host to lock your target.</li>
        </ol>
    </>
);
