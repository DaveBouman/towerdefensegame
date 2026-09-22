import { emitRunSfx } from '../../../game/audio/emitRunSfx';
import { isDesktopShell, quitGame } from '../../../game/desktop/desktopBridge';
import { GAME_BUILD_LABEL, GAME_EARLY_ACCESS_NOTICE, GAME_TAGLINE, GAME_TITLE } from '../../../game/meta/gameMeta';
import { MenuSection, ProgressBadge, type ProgressCount } from './menuShared';

interface MainMenuHomeProps {
    pause: boolean;
    progress: ProgressCount;
    bestiaryProgress: ProgressCount;
    bodyModProgress: ProgressCount;
    onResume: () => void;
    onNewRunConfirm: () => void;
    onOpenArchives: () => void;
    onOpenHowToPlay: () => void;
    onOpenChangelog: () => void;
    onOpenCredits: () => void;
    onOpenSettings: () => void;
}

export const MainMenuHome = ({
    pause,
    progress,
    bestiaryProgress,
    bodyModProgress,
    onResume,
    onNewRunConfirm,
    onOpenArchives,
    onOpenHowToPlay,
    onOpenChangelog,
    onOpenCredits,
    onOpenSettings,
}: MainMenuHomeProps) =>
{
    const desktop = isDesktopShell();

    const header = pause ? (
        <>
            <p className="main-menu__eyebrow">Paused</p>
            <h1 className="main-menu__brand main-menu__brand--pause">{GAME_TITLE}</h1>
            <p className="main-menu__tagline">
                Adjust settings, inspect archives, or abandon this run.
            </p>
        </>
    ) : (
        <>
            <p className="main-menu__eyebrow">{GAME_TAGLINE}</p>
            <h1 className="main-menu__brand">{GAME_TITLE}</h1>
            <p className="main-menu__early-access" role="note">
                <span className="main-menu__early-access-badge">{GAME_BUILD_LABEL}</span>
                {GAME_EARLY_ACCESS_NOTICE}
            </p>
            <p className="main-menu__tagline">
                Build the chain. Solve the trial.
            </p>
        </>
    );

    return (
        <div className="main-menu__home">
            <div className="main-menu__home-scroll">
                {header}

                <div className="main-menu__actions">
                    <MenuSection label="Play">
                        {pause ? (
                            <>
                                <button type="button" className="main-menu__start" onClick={onResume}>
                                    Resume
                                </button>
                                <button
                                    type="button"
                                    className="main-menu__secondary"
                                    onClick={onNewRunConfirm}
                                >
                                    New road
                                </button>
                            </>
                        ) : (
                            <button type="button" className="main-menu__start" onClick={onNewRunConfirm}>
                                Start the road
                            </button>
                        )}
                    </MenuSection>

                    <MenuSection label="Archives">
                        <button
                            type="button"
                            className="main-menu__secondary"
                            onClick={onOpenArchives}
                        >
                            Browse archives
                            <ProgressBadge
                                unlocked={progress.unlocked + bestiaryProgress.unlocked + bodyModProgress.unlocked}
                                total={progress.total + bestiaryProgress.total + bodyModProgress.total}
                            />
                        </button>
                    </MenuSection>

                    <MenuSection label="Help" actionsClassName="main-menu__section-actions--grid">
                        <button
                            type="button"
                            className="main-menu__secondary"
                            onClick={onOpenHowToPlay}
                        >
                            How to play
                        </button>
                        <button
                            type="button"
                            className="main-menu__secondary"
                            onClick={onOpenChangelog}
                        >
                            What&apos;s new
                        </button>
                        <button
                            type="button"
                            className="main-menu__secondary"
                            onClick={onOpenCredits}
                        >
                            Credits
                        </button>
                        <button
                            type="button"
                            className="main-menu__secondary"
                            onClick={onOpenSettings}
                        >
                            Settings
                        </button>
                    </MenuSection>
                </div>
            </div>

            <div className="main-menu__home-footer">
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
        </div>
    );
};
