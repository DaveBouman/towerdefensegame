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

    const quitButton = (
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

    const actions = (
        <>
            <MenuSection label="Run">
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
                            New run
                        </button>
                    </>
                ) : (
                    <button type="button" className="main-menu__start" onClick={onNewRunConfirm}>
                        Start run
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

            <MenuSection label="Help">
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
            </MenuSection>

            <MenuSection label="System">
                <button
                    type="button"
                    className="main-menu__secondary"
                    onClick={onOpenSettings}
                >
                    Settings
                </button>
            </MenuSection>

            <div className="main-menu__actions main-menu__actions--footer">
                {quitButton}
            </div>
        </>
    );

    if (pause)
    {
        return (
            <>
                <p className="main-menu__eyebrow">Paused</p>
                <h1 className="main-menu__brand main-menu__brand--pause">{GAME_TITLE}</h1>
                <p className="main-menu__tagline">
                    Adjust settings, inspect archives, or abandon this run.
                </p>

                <div className="main-menu__actions">{actions}</div>
            </>
        );
    }

    return (
        <>
            <p className="main-menu__eyebrow">{GAME_TAGLINE}</p>
            <h1 className="main-menu__brand">{GAME_TITLE}</h1>
            <p className="main-menu__early-access" role="note">
                <span className="main-menu__early-access-badge">{GAME_BUILD_LABEL}</span>
                {GAME_EARLY_ACCESS_NOTICE}
            </p>
            <p className="main-menu__tagline">
                Link the grid, outlast the street, and cut down the Warden.
            </p>

            <div className="main-menu__actions">{actions}</div>
        </>
    );
};
