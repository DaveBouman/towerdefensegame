import { useEffect, useState, type ReactNode } from 'react';
import { emitRunSfx } from '../../game/audio/emitRunSfx';
import {
    getAudioSettings,
    setMasterVolume,
    setMusicVolume,
    setSfxMuted,
    setSfxVolume,
    subscribeSfxSettings,
} from '../../game/audio/gameAudio';
import type { AudioSettings } from '../../game/audio/audioSettings';
import {
    isDesktopShell,
    isDocumentFullscreen,
    quitGame,
    setGameFullscreen,
} from '../../game/desktop/desktopBridge';
import { poisonStatusName } from '../../game/copy/strings';
import { GAME_ALPHA_NOTICE, GAME_BUILD_LABEL, GAME_TAGLINE, GAME_TITLE, GAME_VERSION } from '../../game/meta/gameMeta';
import { getCollectionProgress } from '../../game/run/cardCollection';
import { getBestiaryProgress } from '../../game/run/enemyBestiary';
import { getBodyModBestiaryProgress } from '../../game/run/bodyModBestiary';
import { createRandomSeed, normalizeSeed } from '../../game/random/rng';
import { describeAscensionLevel, readRunAscensionLevel } from '../../game/run/ascension';
import {
    TEXT_SCALE_SIZES,
    type TextScaleSize,
    readTextScale,
    setTextScale,
} from '../../game/ui/textScale';
import { BestiaryOverlay } from './BestiaryOverlay';
import { CardCollectionOverlay } from './CardCollectionOverlay';
import { BodyModBestiaryOverlay } from './BodyModBestiaryOverlay';
import { CyberPanelChrome } from './CyberPanel';
import { BOARD_COL_LABELS, BOARD_ROW_LABELS } from '../../game/board/boardCoordinates';

type MenuMode = 'boot' | 'pause';
type MenuScreen = 'home' | 'archives' | 'settings' | 'how-to-play' | 'credits' | 'confirm-new-run';

interface MainMenuOverlayProps {
    mode?: MenuMode;
    seed: string;
    ascensionLevel?: number;
    onStart: (seed: string) => void;
    onResume?: () => void;
    onNewRun?: (seed: string) => void;
    onReplayTutorial: () => void;
}

const percent = (value: number): number => Math.round(value * 100);

const VolumeRow = ({
    label,
    value,
    disabled,
    onChange,
}: {
    label: string;
    value: number;
    disabled?: boolean;
    onChange: (next: number) => void;
}) => (
    <label className="main-menu__volume-row">
        <span className="main-menu__volume-label">{label}</span>
        <input
            className="main-menu__volume"
            type="range"
            min={0}
            max={100}
            step={1}
            value={percent(value)}
            disabled={disabled}
            aria-label={`${label} volume`}
            onChange={(event) => onChange(Number(event.target.value) / 100)}
        />
        <span className="main-menu__volume-value" aria-hidden="true">
            {disabled ? '—' : `${percent(value)}%`}
        </span>
    </label>
);

const MenuSection = ({
    label,
    children,
}: {
    label: string;
    children: ReactNode;
}) => (
    <div className="main-menu__section">
        <p className="main-menu__section-label">{label}</p>
        <div className="main-menu__section-actions">{children}</div>
    </div>
);

const ProgressBadge = ({ unlocked, total }: { unlocked: number; total: number }) => (
    <span className="main-menu__collection-count">{unlocked}/{total}</span>
);

const BackButton = ({ onClick }: { onClick: () => void }) => (
    <button
        type="button"
        className="main-menu__nav-back"
        onClick={() =>
        {
            emitRunSfx('ui-click', { volume: 0.66, rate: 0.94 });
            onClick();
        }}
    >
        ← Back
    </button>
);

export const MainMenuOverlay = ({
    mode = 'boot',
    seed,
    ascensionLevel: ascensionLevelProp,
    onStart,
    onResume,
    onNewRun,
    onReplayTutorial,
}: MainMenuOverlayProps) =>
{
    const pause = mode === 'pause';
    const ascensionLevel = ascensionLevelProp ?? readRunAscensionLevel();
    const [ screen, setScreen ] = useState<MenuScreen>('home');
    const [ draftSeed, setDraftSeed ] = useState(seed);
    const [ audio, setAudio ] = useState<AudioSettings>(getAudioSettings);
    const [ showCollection, setShowCollection ] = useState(false);
    const [ showBestiary, setShowBestiary ] = useState(false);
    const [ showBodyModBestiary, setShowBodyModBestiary ] = useState(false);
    const [ progress, setProgress ] = useState(getCollectionProgress);
    const [ bestiaryProgress, setBestiaryProgress ] = useState(getBestiaryProgress);
    const [ bodyModProgress, setBodyModProgress ] = useState(getBodyModBestiaryProgress);
    const [ fullscreen, setFullscreen ] = useState(isDocumentFullscreen);
    const [ textScale, setTextScaleState ] = useState<TextScaleSize>(readTextScale);
    const [ tutorialArmed, setTutorialArmed ] = useState(false);
    const desktop = isDesktopShell();

    useEffect(() => subscribeSfxSettings(setAudio), []);

    useEffect(() =>
    {
        if (!showCollection)
        {
            setProgress(getCollectionProgress());
        }
    }, [ showCollection ]);

    useEffect(() =>
    {
        if (!showBestiary)
        {
            setBestiaryProgress(getBestiaryProgress());
        }
    }, [ showBestiary ]);

    useEffect(() =>
    {
        if (!showBodyModBestiary)
        {
            setBodyModProgress(getBodyModBestiaryProgress());
        }
    }, [ showBodyModBestiary ]);

    useEffect(() =>
    {
        const onFullscreenChange = (): void => setFullscreen(isDocumentFullscreen());

        document.addEventListener('fullscreenchange', onFullscreenChange);

        return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
    }, []);

    useEffect(() =>
    {
        if (!pause || !onResume)
        {
            return;
        }

        const onKeyDown = (event: KeyboardEvent): void =>
        {
            if (event.key === 'Escape' && screen === 'home')
            {
                event.preventDefault();
                onResume();
            }
        };

        window.addEventListener('keydown', onKeyDown);

        return () => window.removeEventListener('keydown', onKeyDown);
    }, [ pause, onResume, screen ]);

    const openHome = (): void => setScreen('home');

    const openScreen = (next: MenuScreen): void =>
    {
        emitRunSfx('ui-click', { volume: 0.68 });

        if (next === 'confirm-new-run')
        {
            setDraftSeed(createRandomSeed());
        }

        setScreen(next);
    };

    const openNewRunConfirm = (): void =>
    {
        openScreen('confirm-new-run');
    };

    const resumeRun = (): void =>
    {
        emitRunSfx('ui-select', { volume: 0.78 });
        onResume?.();
    };

    const confirmNewRun = (): void =>
    {
        emitRunSfx('ui-select', { volume: 0.88, rate: 0.98 });
        const nextSeed = normalizeSeed(draftSeed);

        if (pause)
        {
            onNewRun?.(nextSeed);
            return;
        }

        onStart(nextSeed);
    };

    const openCollection = (): void =>
    {
        emitRunSfx('ui-select', { volume: 0.74, rate: 1.02 });
        setShowBestiary(false);
        setShowBodyModBestiary(false);
        setShowCollection(true);
    };

    const openBestiary = (): void =>
    {
        emitRunSfx('ui-select', { volume: 0.74, rate: 0.96 });
        setShowCollection(false);
        setShowBodyModBestiary(false);
        setShowBestiary(true);
    };

    const openBodyModBestiary = (): void =>
    {
        emitRunSfx('ui-select', { volume: 0.74, rate: 1.04 });
        setShowCollection(false);
        setShowBestiary(false);
        setShowBodyModBestiary(true);
    };

    const chooseTextScale = (size: TextScaleSize): void =>
    {
        if (size === textScale)
        {
            return;
        }

        emitRunSfx('ui-click', { volume: 0.64, rate: 1.06 });
        setTextScale(size);
        setTextScaleState(size);
    };

    const randomizeDraftSeed = (): void =>
    {
        emitRunSfx('ui-click', { volume: 0.62, rate: 1.1 });
        setDraftSeed(createRandomSeed());
    };

    const archiveOpen = showCollection || showBestiary || showBodyModBestiary;
    const openArchives = (): void => openScreen('archives');
    const backFromSubscreen = (): void =>
    {
        if (screen === 'archives' && archiveOpen)
        {
            setShowCollection(false);
            setShowBestiary(false);
            setShowBodyModBestiary(false);
            return;
        }

        openHome();
    };

    const renderQuitButton = (): ReactNode => (
        <button
            type="button"
            className="main-menu__quit"
            onClick={() =>
            {
                emitRunSfx('ui-click', { volume: 0.6, rate: 0.85 });
                quitGame();
            }}
            title={desktop ? 'Quit to desktop' : 'Close window'}
        >
            Quit
        </button>
    );

    const renderArchivesHub = (): ReactNode => (
        <>
            <BackButton onClick={backFromSubscreen} />
            <p className="main-menu__eyebrow">Data vault</p>
            <h2 className="main-menu__screen-title">Archives</h2>
            <p className="main-menu__tagline main-menu__tagline--screen">
                Unlocked entries persist across runs.
            </p>
            <div className="main-menu__actions">
                <button
                    type="button"
                    className="main-menu__secondary"
                    onClick={openCollection}
                >
                    Card index
                    <ProgressBadge unlocked={progress.unlocked} total={progress.total} />
                </button>
                <button
                    type="button"
                    className="main-menu__secondary"
                    onClick={openBestiary}
                >
                    Bestiary
                    <ProgressBadge unlocked={bestiaryProgress.unlocked} total={bestiaryProgress.total} />
                </button>
                <button
                    type="button"
                    className="main-menu__secondary"
                    onClick={openBodyModBestiary}
                >
                    Body mods
                    <ProgressBadge unlocked={bodyModProgress.unlocked} total={bodyModProgress.total} />
                </button>
            </div>
        </>
    );

    const renderHomeActions = (): ReactNode => (
        <>
            <MenuSection label="Run">
                {pause ? (
                    <>
                        <button type="button" className="main-menu__start" onClick={resumeRun}>
                            Resume
                        </button>
                        <button
                            type="button"
                            className="main-menu__secondary"
                            onClick={openNewRunConfirm}
                        >
                            New run
                        </button>
                    </>
                ) : (
                    <button type="button" className="main-menu__start" onClick={openNewRunConfirm}>
                        Start run
                    </button>
                )}
            </MenuSection>

            <MenuSection label="Archives">
                <button
                    type="button"
                    className="main-menu__secondary"
                    onClick={openArchives}
                >
                    Browse archives
                    <ProgressBadge
                        unlocked={progress.unlocked + bestiaryProgress.unlocked + bodyModProgress.unlocked}
                        total={progress.total + bestiaryProgress.total + bodyModProgress.total}
                    />
                </button>
            </MenuSection>

            <MenuSection label="Help">
                <button
                    type="button"
                    className="main-menu__secondary"
                    onClick={() => openScreen('how-to-play')}
                >
                    How to play
                </button>
                <button
                    type="button"
                    className="main-menu__secondary"
                    onClick={() => openScreen('credits')}
                >
                    Credits
                </button>
            </MenuSection>

            <MenuSection label="System">
                <button
                    type="button"
                    className="main-menu__secondary"
                    onClick={() => openScreen('settings')}
                >
                    Settings
                </button>
            </MenuSection>

            <div className="main-menu__actions main-menu__actions--footer">
                {renderQuitButton()}
            </div>
        </>
    );

    return (
        <>
            <div className={`main-menu${pause ? ' main-menu--pause' : ''}`}>
                <div className="main-menu__glow" aria-hidden="true" />
                {!archiveOpen && (
                <div className="main-menu__panel cp-panel cp-panel--cyan">
                    <CyberPanelChrome variant="cyan" />

                    {screen === 'home' && !pause && (
                        <>
                            <p className="main-menu__eyebrow">{GAME_TAGLINE}</p>
                            <h1 className="main-menu__brand">{GAME_TITLE}</h1>
                            <p className="main-menu__alpha" role="note">
                                <span className="main-menu__alpha-badge">{GAME_BUILD_LABEL}</span>
                                {GAME_ALPHA_NOTICE}
                            </p>
                            <p className="main-menu__tagline">
                                Link the grid, outlast the street, and cut down the Warden.
                            </p>

                            <div className="main-menu__actions">{renderHomeActions()}</div>
                        </>
                    )}

                    {screen === 'home' && pause && (
                        <>
                            <p className="main-menu__eyebrow">Paused</p>
                            <h1 className="main-menu__brand main-menu__brand--pause">{GAME_TITLE}</h1>
                            <p className="main-menu__tagline">
                                Adjust settings, inspect archives, or abandon this run.
                            </p>

                            <div className="main-menu__actions">{renderHomeActions()}</div>
                        </>
                    )}

                    {screen === 'archives' && renderArchivesHub()}

                    {screen === 'confirm-new-run' && (
                        <>
                            <BackButton onClick={openHome} />
                            <p className="main-menu__eyebrow">{pause ? 'Confirm' : 'Jack in'}</p>
                            <h2 className="main-menu__screen-title">
                                {pause ? 'Start a new run?' : 'Start run'}
                            </h2>
                            {pause && (
                                <p className="main-menu__confirm-copy">
                                    This abandons your current progress. The map, deck, and HP will reset.
                                </p>
                            )}
                            <label className="main-menu__field main-menu__field--seed">
                                <span className="main-menu__field-label">Run seed</span>
                                <span className="main-menu__seed-row">
                                    <input
                                        className="main-menu__seed-input"
                                        value={draftSeed}
                                        maxLength={12}
                                        spellCheck={false}
                                        aria-label="Run seed"
                                        onChange={(event) => setDraftSeed(event.target.value)}
                                    />
                                    <button
                                        type="button"
                                        className="main-menu__seed-random"
                                        title="Random seed"
                                        aria-label="Random seed"
                                        onClick={randomizeDraftSeed}
                                    >
                                        &#x21bb;
                                    </button>
                                </span>
                            </label>
                            <div className="main-menu__field">
                                <span className="main-menu__field-label">Ascension</span>
                                <p className="main-menu__seed-readonly" aria-label="Ascension level">
                                    {describeAscensionLevel(ascensionLevel)}
                                </p>
                                <p className="main-menu__hint main-menu__field-hint--muted">
                                    Clear the Warden to unlock the next tier.
                                </p>
                            </div>
                            <div className="main-menu__actions">
                                <button
                                    type="button"
                                    className={`main-menu__start${pause ? ' main-menu__start--danger' : ''}`}
                                    onClick={confirmNewRun}
                                >
                                    {pause ? 'Yes, new run' : 'Start run'}
                                </button>
                                <button
                                    type="button"
                                    className="main-menu__secondary"
                                    onClick={() => openScreen('home')}
                                >
                                    {pause ? 'Keep current run' : 'Back'}
                                </button>
                            </div>
                        </>
                    )}

                    {screen === 'settings' && (
                        <>
                            <BackButton onClick={openHome} />
                            <p className="main-menu__eyebrow">Options</p>
                            <h2 className="main-menu__screen-title">Settings</h2>

                            <div className="main-menu__settings">
                                {pause && (
                                    <div className="main-menu__field">
                                        <span className="main-menu__field-label">Current seed</span>
                                        <p className="main-menu__seed-readonly" aria-label="Current run seed">
                                            {seed}
                                        </p>
                                        <p className="main-menu__hint">
                                            To play a different seed, use New run.
                                        </p>
                                    </div>
                                )}

                                <div className="main-menu__field">
                                    <span className="main-menu__field-label">Audio</span>
                                    <div className="main-menu__audio-panel">
                                        <button
                                            type="button"
                                            className={`main-menu__mute${audio.muted ? ' main-menu__mute--on' : ''}`}
                                            aria-pressed={audio.muted}
                                            onClick={() =>
                                            {
                                                emitRunSfx('ui-click', { volume: 0.7 });
                                                setSfxMuted(!audio.muted);
                                            }}
                                        >
                                            {audio.muted ? 'Muted' : 'Audio on'}
                                        </button>
                                        <VolumeRow
                                            label="Master"
                                            value={audio.masterVolume}
                                            disabled={audio.muted}
                                            onChange={setMasterVolume}
                                        />
                                        <VolumeRow
                                            label="Music"
                                            value={audio.musicVolume}
                                            disabled={audio.muted}
                                            onChange={setMusicVolume}
                                        />
                                        <VolumeRow
                                            label="SFX"
                                            value={audio.sfxVolume}
                                            disabled={audio.muted}
                                            onChange={setSfxVolume}
                                        />
                                    </div>
                                </div>

                                <div className="main-menu__field">
                                    <span className="main-menu__field-label">Display</span>
                                    <div className="main-menu__display-panel">
                                        <span className="main-menu__sublabel">Text size</span>
                                        <div
                                            className="main-menu__size-row"
                                            role="radiogroup"
                                            aria-label="Text size"
                                        >
                                            {TEXT_SCALE_SIZES.map((size) => (
                                                <button
                                                    key={size}
                                                    type="button"
                                                    role="radio"
                                                    aria-checked={textScale === size}
                                                    className={`main-menu__size-option${textScale === size ? ' main-menu__size-option--active' : ''}`}
                                                    onClick={() => chooseTextScale(size)}
                                                >
                                                    {size === 'small' ? 'Small' : size === 'medium' ? 'Medium' : 'Large'}
                                                </button>
                                            ))}
                                        </div>
                                        <button
                                            type="button"
                                            className={`main-menu__toggle${fullscreen ? ' main-menu__toggle--on' : ''}`}
                                            aria-pressed={fullscreen}
                                            onClick={() =>
                                            {
                                                emitRunSfx('ui-click', { volume: 0.68 });
                                                void setGameFullscreen(!fullscreen).then(() =>
                                                {
                                                    setFullscreen(isDocumentFullscreen());
                                                });
                                            }}
                                        >
                                            {fullscreen ? 'Fullscreen on' : 'Fullscreen off'}
                                        </button>
                                    </div>
                                </div>

                                <div className="main-menu__field">
                                    <span className="main-menu__field-label">Teaching</span>
                                    <button
                                        type="button"
                                        className="main-menu__secondary"
                                        onClick={() =>
                                        {
                                            emitRunSfx('ui-select', { volume: 0.72 });
                                            onReplayTutorial();
                                            setTutorialArmed(true);
                                        }}
                                    >
                                        Replay first-run tips
                                    </button>
                                    {tutorialArmed && (
                                        <p className="main-menu__hint">
                                            Tips will show again when you start the next run.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </>
                    )}

                    {screen === 'how-to-play' && (
                        <>
                            <BackButton onClick={openHome} />
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
                                    {BOARD_ROW_LABELS.map((rowLabel, row) => (
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
                    )}

                    {screen === 'credits' && (
                        <>
                            <BackButton onClick={openHome} />
                            <p className="main-menu__eyebrow">Transmission</p>
                            <h2 className="main-menu__screen-title">Credits</h2>
                            <div className="main-menu__credits">
                                <p>
                                    Temporary art (to be replaced):
                                </p>
                                <p>
                                    UI icons — Craftpix free cyberpunk icon packs
                                    (craftpix-net-172155, craftpix-net-507528).
                                </p>
                                <p>
                                    Enemy portraits — Craftpix free cyberpunk avatar packs
                                    (craftpix-net-108089, craftpix-net-969033).
                                </p>
                                <p className="main-menu__hint">
                                    License: <a href="https://craftpix.net/file-licenses/" target="_blank" rel="noreferrer">craftpix.net/file-licenses</a>
                                </p>
                            </div>
                        </>
                    )}

                    <p className="main-menu__version">
                        v{GAME_VERSION} · {GAME_BUILD_LABEL}
                        {desktop ? ' · desktop' : ' · web'}
                    </p>
                </div>
                )}
            </div>

            {showCollection && (
                <CardCollectionOverlay onClose={() => setShowCollection(false)} />
            )}
            {showBestiary && (
                <BestiaryOverlay onClose={() => setShowBestiary(false)} />
            )}
            {showBodyModBestiary && (
                <BodyModBestiaryOverlay onClose={() => setShowBodyModBestiary(false)} />
            )}
        </>
    );
};
