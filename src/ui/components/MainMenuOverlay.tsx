import { useEffect, useState } from 'react';
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
import { GAME_TAGLINE, GAME_TITLE, GAME_VERSION } from '../../game/meta/gameMeta';
import { getCollectionProgress } from '../../game/run/cardCollection';
import { createRandomSeed, normalizeSeed } from '../../game/random/rng';
import {
    TEXT_SCALE_SIZES,
    type TextScaleSize,
    readTextScale,
    setTextScale,
} from '../../game/ui/textScale';
import { CardCollectionOverlay } from './CardCollectionOverlay';
import { CyberPanelChrome } from './CyberPanel';

type MenuMode = 'boot' | 'pause';
type MenuScreen = 'home' | 'settings' | 'how-to-play' | 'credits' | 'confirm-new-run';

interface MainMenuOverlayProps {
    mode?: MenuMode;
    seed: string;
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
    onStart,
    onResume,
    onNewRun,
    onReplayTutorial,
}: MainMenuOverlayProps) =>
{
    const pause = mode === 'pause';
    const [ screen, setScreen ] = useState<MenuScreen>('home');
    const [ draftSeed, setDraftSeed ] = useState(seed);
    const [ audio, setAudio ] = useState<AudioSettings>(getAudioSettings);
    const [ showCollection, setShowCollection ] = useState(false);
    const [ progress, setProgress ] = useState(getCollectionProgress);
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
        setShowCollection(true);
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

    return (
        <>
            <div className={`main-menu${pause ? ' main-menu--pause' : ''}`}>
                <div className="main-menu__glow" aria-hidden="true" />
                <div className="main-menu__panel cp-panel cp-panel--cyan">
                    <CyberPanelChrome variant="cyan" />

                    {screen === 'home' && !pause && (
                        <>
                            <p className="main-menu__eyebrow">{GAME_TAGLINE}</p>
                            <h1 className="main-menu__brand">{GAME_TITLE}</h1>
                            <p className="main-menu__tagline">
                                Link the grid, outlast the street, and cut down the Warden.
                            </p>

                            <div className="main-menu__actions">
                                <button type="button" className="main-menu__start" onClick={openNewRunConfirm}>
                                    Start run
                                </button>
                                <button
                                    type="button"
                                    className="main-menu__secondary"
                                    onClick={openCollection}
                                >
                                    Card index
                                    <span className="main-menu__collection-count">
                                        {progress.unlocked}/{progress.total}
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    className="main-menu__secondary"
                                    onClick={() => openScreen('settings')}
                                >
                                    Settings
                                </button>
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
                            </div>
                        </>
                    )}

                    {screen === 'home' && pause && (
                        <>
                            <p className="main-menu__eyebrow">Paused</p>
                            <h1 className="main-menu__brand main-menu__brand--pause">{GAME_TITLE}</h1>
                            <p className="main-menu__tagline">
                                Adjust settings, inspect the card index, or abandon this run.
                            </p>

                            <div className="main-menu__actions">
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
                                <button
                                    type="button"
                                    className="main-menu__secondary"
                                    onClick={openCollection}
                                >
                                    Card index
                                    <span className="main-menu__collection-count">
                                        {progress.unlocked}/{progress.total}
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    className="main-menu__secondary"
                                    onClick={() => openScreen('settings')}
                                >
                                    Settings
                                </button>
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
                            </div>
                        </>
                    )}

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
                            <ol className="main-menu__manual">
                                <li>Place cards on the 5×5 grid so their arrows form a chain.</li>
                                <li>Set chain start in column 0, then press Attack.</li>
                                <li>Attack and defense cards off the chain still grant small bonuses.</li>
                                <li>Each Attack spends energy; when empty, the board clears for a new round.</li>
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
                                    <strong>{GAME_TITLE}</strong> — card-chain combat run.
                                </p>
                                <p>Engine: Phaser + React. Audio buses and map UI built for desktop packaging.</p>
                                <p>
                                    Music loops: <em>Glass Streets at Midnight</em>, <em>Concrete Veins</em>,{' '}
                                    <em>Last Gatekeeper</em>.
                                </p>
                                <p>UI icons: Craftpix cyberpunk pack. Enemy portraits: Craftpix avatars.</p>
                                <p className="main-menu__hint">
                                    Desktop / Steam shell: inject <code>window.signalChainDesktop</code> (see{' '}
                                    <code>docs/electron-steam.md</code>).
                                </p>
                            </div>
                        </>
                    )}

                    <p className="main-menu__version">
                        v{GAME_VERSION}
                        {desktop ? ' · desktop' : ' · web'}
                    </p>
                </div>
            </div>

            {showCollection && (
                <CardCollectionOverlay onClose={() => setShowCollection(false)} />
            )}
        </>
    );
};
