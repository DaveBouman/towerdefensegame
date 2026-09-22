import {
    getLoopEncounter,
    getStationPreview,
    LOOP_MAP_STEPS,
    loopStepPosition,
    stationAtStep,
    type LoopEncounter,
} from '../../game/run/loopRun';
import { getEnemyPortraitUrl } from '../../game/cardGame/presentation/enemyIdentity';

interface LoopMapOverlayProps {
    dungeon: boolean;
    walkerStep: number;
    clearedSteps: readonly number[];
    onAdvance: () => void;
    onFightStation: () => void;
    onRetreatHome: () => void;
}

/** Walk map on the right — chain board stays visible on the left. */
export const LoopMapOverlay = ({
    dungeon,
    walkerStep,
    clearedSteps,
    onAdvance,
    onFightStation,
    onRetreatHome,
}: LoopMapOverlayProps) =>
{
    const encounter: LoopEncounter = getLoopEncounter(dungeon);
    const cleared = new Set(clearedSteps);
    const stationHere = stationAtStep(encounter, walkerStep);
    const canFight = Boolean(stationHere && !cleared.has(walkerStep));
    const remaining = encounter.stations.filter((s) => !cleared.has(s.stepIndex)).length;
    const walker = loopStepPosition(walkerStep);

    return (
        <div className="loop-map">
            <div className="loop-map__panel">
                <header className="loop-map__header">
                    <p className="loop-map__eyebrow">Walk map</p>
                    <h1 className="loop-map__title">{encounter.title}</h1>
                    <p className="loop-map__tagline">
                        Pack from top-left (right/down starters). Engage to see enemy damage and
                        HIT timing — the board marks which card the hit lands on. Then Attack to
                        lock and auto-loop.
                        {' '}{remaining} station{remaining === 1 ? '' : 's'} left.
                    </p>
                </header>

                <svg className="loop-map__svg" viewBox="0 0 100 100" aria-label="Circular road">
                    <circle
                        cx="50"
                        cy="50"
                        r="36"
                        fill="none"
                        stroke="rgba(252, 238, 10, 0.35)"
                        strokeWidth="2.5"
                        strokeDasharray="3 2"
                    />
                    {Array.from({ length: LOOP_MAP_STEPS }, (_, step) =>
                    {
                        const pos = loopStepPosition(step);
                        const station = stationAtStep(encounter, step);
                        const isCleared = station ? cleared.has(step) : false;
                        const isHere = step === walkerStep;

                        return (
                            <g key={step}>
                                <circle
                                    cx={pos.x}
                                    cy={pos.y}
                                    r={station ? 3.2 : 1.4}
                                    fill={
                                        isCleared
                                            ? 'rgba(0, 255, 157, 0.7)'
                                            : station
                                                ? 'rgba(255, 45, 149, 0.9)'
                                                : 'rgba(252, 238, 10, 0.45)'
                                    }
                                    stroke={isHere ? '#fff6ea' : 'transparent'}
                                    strokeWidth={isHere ? 0.8 : 0}
                                />
                            </g>
                        );
                    })}
                    <circle
                        cx={walker.x}
                        cy={walker.y}
                        r="4"
                        fill="#00e8ff"
                        stroke="#fff6ea"
                        strokeWidth="0.9"
                    />
                </svg>

                <div className="loop-map__stations">
                    {encounter.stations.map((station) =>
                    {
                        const preview = getStationPreview(station.enemyId);
                        const done = cleared.has(station.stepIndex);
                        const here = station.stepIndex === walkerStep;

                        return (
                            <div
                                key={station.stepIndex}
                                className={`loop-map__station${done ? ' loop-map__station--cleared' : ''}${here ? ' loop-map__station--here' : ''}`}
                            >
                                <img
                                    src={getEnemyPortraitUrl(preview.portraitFile)}
                                    alt=""
                                    width={36}
                                    height={36}
                                />
                                <div>
                                    <strong>{preview.label}</strong>
                                    <span>
                                        Step {station.stepIndex + 1}
                                        {done
                                            ? ' · cleared'
                                            : ' · hostile'}
                                        {here && !done ? ' · here' : ''}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <footer className="loop-map__footer">
                    {canFight ? (
                        <button type="button" className="main-menu__start" onClick={onFightStation}>
                            Engage — plan then Attack
                        </button>
                    ) : (
                        <button type="button" className="main-menu__start" onClick={onAdvance}>
                            Advance
                        </button>
                    )}
                    <button type="button" className="main-menu__secondary" onClick={onRetreatHome}>
                        Back to home
                    </button>
                </footer>
            </div>
        </div>
    );
};
