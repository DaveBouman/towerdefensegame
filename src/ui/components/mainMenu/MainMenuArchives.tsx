import { BackButton, ProgressBadge, type ProgressCount } from './menuShared';

interface MainMenuArchivesProps {
    progress: ProgressCount;
    bestiaryProgress: ProgressCount;
    bodyModProgress: ProgressCount;
    onBack: () => void;
    onOpenCollection: () => void;
    onOpenBestiary: () => void;
    onOpenBodyModBestiary: () => void;
}

export const MainMenuArchives = ({
    progress,
    bestiaryProgress,
    bodyModProgress,
    onBack,
    onOpenCollection,
    onOpenBestiary,
    onOpenBodyModBestiary,
}: MainMenuArchivesProps) => (
    <>
        <BackButton onClick={onBack} />
        <p className="main-menu__eyebrow">Data vault</p>
        <h2 className="main-menu__screen-title">Archives</h2>
        <p className="main-menu__tagline main-menu__tagline--screen">
            Unlocked entries persist across runs.
        </p>
        <div className="main-menu__actions">
            <button
                type="button"
                className="main-menu__secondary"
                onClick={onOpenCollection}
            >
                Card index
                <ProgressBadge unlocked={progress.unlocked} total={progress.total} />
            </button>
            <button
                type="button"
                className="main-menu__secondary"
                onClick={onOpenBestiary}
            >
                Bestiary
                <ProgressBadge unlocked={bestiaryProgress.unlocked} total={bestiaryProgress.total} />
            </button>
            <button
                type="button"
                className="main-menu__secondary"
                onClick={onOpenBodyModBestiary}
            >
                Body mods
                <ProgressBadge unlocked={bodyModProgress.unlocked} total={bodyModProgress.total} />
            </button>
        </div>
    </>
);
