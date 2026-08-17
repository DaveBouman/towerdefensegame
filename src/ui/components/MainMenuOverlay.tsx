import { useEffect, useState } from 'react';
import { emitRunSfx } from '../../game/audio/emitRunSfx';
import {
    getAudioSettings,
    subscribeSfxSettings,
} from '../../game/audio/gameAudio';
import type { AudioSettings } from '../../game/audio/audioSettings';
import {
    isDesktopShell,
    readGameFullscreen,
    subscribeGameFullscreen,
} from '../../game/desktop/desktopBridge';
import { GAME_BUILD_LABEL, GAME_VERSION } from '../../game/meta/gameMeta';
import { getCollectionProgress } from '../../game/run/cardCollection';
import { getBestiaryProgress } from '../../game/run/enemyBestiary';
import { getBodyModBestiaryProgress } from '../../game/run/bodyModBestiary';
import { createRandomSeed, normalizeSeed } from '../../game/random/rng';
import { readRunAscensionLevel } from '../../game/run/ascension';
import {
    type TextScaleSize,
    readTextScale,
} from '../../game/ui/textScale';
import { BestiaryOverlay } from './BestiaryOverlay';
import { CardCollectionOverlay } from './CardCollectionOverlay';
import { BodyModBestiaryOverlay } from './BodyModBestiaryOverlay';
import { CyberPanelChrome } from './CyberPanel';
import { MainMenuArchives } from './mainMenu/MainMenuArchives';
import { MainMenuCredits } from './mainMenu/MainMenuCredits';
import { MainMenuHome } from './mainMenu/MainMenuHome';
import { MainMenuHowToPlay } from './mainMenu/MainMenuHowToPlay';
import { MainMenuSettings } from './mainMenu/MainMenuSettings';
import { NewRunConfirm } from './mainMenu/NewRunConfirm';
import type { MenuMode, MenuScreen } from './mainMenu/menuShared';

interface MainMenuOverlayProps {
    mode?: MenuMode;
    seed: string;
    ascensionLevel?: number;
    onStart: (seed: string) => void;
    onResume?: () => void;
    onNewRun?: (seed: string) => void;
    onReplayTutorial: () => void;
}

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
    const [ fullscreen, setFullscreen ] = useState(false);
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
        void readGameFullscreen().then(setFullscreen);

        return subscribeGameFullscreen(setFullscreen);
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

    return (
        <>
            <div className={`main-menu${pause ? ' main-menu--pause' : ''}`}>
                <div className="main-menu__glow" aria-hidden="true" />
                {!archiveOpen && (
                <div className="main-menu__panel cp-panel cp-panel--cyan">
                    <CyberPanelChrome variant="cyan" />

                    {screen === 'home' && (
                        <MainMenuHome
                            pause={pause}
                            progress={progress}
                            bestiaryProgress={bestiaryProgress}
                            bodyModProgress={bodyModProgress}
                            onResume={resumeRun}
                            onNewRunConfirm={openNewRunConfirm}
                            onOpenArchives={openArchives}
                            onOpenHowToPlay={() => openScreen('how-to-play')}
                            onOpenCredits={() => openScreen('credits')}
                            onOpenSettings={() => openScreen('settings')}
                        />
                    )}

                    {screen === 'archives' && (
                        <MainMenuArchives
                            progress={progress}
                            bestiaryProgress={bestiaryProgress}
                            bodyModProgress={bodyModProgress}
                            onBack={backFromSubscreen}
                            onOpenCollection={openCollection}
                            onOpenBestiary={openBestiary}
                            onOpenBodyModBestiary={openBodyModBestiary}
                        />
                    )}

                    {screen === 'confirm-new-run' && (
                        <NewRunConfirm
                            pause={pause}
                            draftSeed={draftSeed}
                            ascensionLevel={ascensionLevel}
                            onBack={openHome}
                            onDraftSeedChange={setDraftSeed}
                            onRandomizeSeed={randomizeDraftSeed}
                            onConfirm={confirmNewRun}
                            onCancel={() => openScreen('home')}
                        />
                    )}

                    {screen === 'settings' && (
                        <MainMenuSettings
                            pause={pause}
                            seed={seed}
                            audio={audio}
                            fullscreen={fullscreen}
                            textScale={textScale}
                            tutorialArmed={tutorialArmed}
                            onBack={openHome}
                            onFullscreenChange={setFullscreen}
                            onTextScaleChange={setTextScaleState}
                            onTutorialArmed={() => setTutorialArmed(true)}
                            onReplayTutorial={onReplayTutorial}
                        />
                    )}

                    {screen === 'how-to-play' && (
                        <MainMenuHowToPlay onBack={openHome} />
                    )}

                    {screen === 'credits' && (
                        <MainMenuCredits onBack={openHome} />
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
