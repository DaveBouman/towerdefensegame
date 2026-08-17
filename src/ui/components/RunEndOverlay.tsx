import { ModalShell } from './CyberPanel';
import { getAscensionUnlockNotice } from '../../game/run/ascension';
import type { RunStats } from '../../game/run/runStats';

interface RunEndOverlayProps {
    variant: 'victory' | 'defeat';
    clutch?: boolean;
    stats?: RunStats;
    unlockedAscension?: number | null;
    onRestart: () => void;
    onMainMenu: () => void;
}

const COPY = {
    victory: {
        eyebrow: 'Run complete',
        title: 'The gauntlet is broken',
        summary: 'You cleared every path and felled the final warden. Begin a fresh run to face a new map.',
        button: 'New run',
    },
    defeat: {
        eyebrow: 'Run ended',
        title: 'You have fallen',
        summary: 'Your vitality gave out. The map resets — steel yourself and try a new path.',
        button: 'Try again',
    },
} as const;

export const RunEndOverlay = ({
    variant,
    clutch = false,
    stats,
    unlockedAscension = null,
    onRestart,
    onMainMenu,
}: RunEndOverlayProps) =>
{
    const copy = COPY[variant];
    const panelVariant = variant === 'victory' ? 'green' : 'magenta';
    const unlockNotice = variant === 'victory' && unlockedAscension !== null
        ? getAscensionUnlockNotice(unlockedAscension)
        : null;

    return (
        <ModalShell
            variant={panelVariant}
            rootClassName={`run-end run-end--${variant}${clutch ? ' run-end--clutch' : ''}`}
            panelClassName="run-end__panel"
        >
            {clutch && variant === 'victory' && (
                <p className="run-end__clutch">Clutch clear — you limped out at critical integrity.</p>
            )}
            <p className="run-end__eyebrow">{copy.eyebrow}</p>
            <h1 className="run-end__title">{copy.title}</h1>
            <p className="run-end__summary">{copy.summary}</p>

            {unlockNotice && (
                <aside
                    className={`run-end__unlock${unlockNotice.firstClear ? ' run-end__unlock--debut' : ''}`}
                    role="status"
                >
                    <p className="run-end__unlock-eyebrow">
                        {unlockNotice.firstClear ? 'First clear' : 'Difficulty'}
                    </p>
                    <h2 className="run-end__unlock-title">{unlockNotice.title}</h2>
                    {unlockNotice.lines.map((line) => (
                        <p key={line} className="run-end__unlock-line">{line}</p>
                    ))}
                </aside>
            )}

            {stats && (
                <ul className="run-end__stats">
                    <li><span>Battles won</span><strong>{stats.battlesWon}</strong></li>
                    <li><span>Nodes cleared</span><strong>{stats.pathLength}</strong></li>
                    <li><span>Damage dealt</span><strong>{stats.damageDealt}</strong></li>
                    <li><span>Damage taken</span><strong>{stats.damageTaken}</strong></li>
                    <li><span>Cards added</span><strong>{stats.cardsAdded}</strong></li>
                    <li><span>Body mods installed</span><strong>{stats.bodyModsCollected}</strong></li>
                    <li><span>Creds earned</span><strong>{stats.credsEarned}</strong></li>
                    {stats.ascensionLevel > 0 && (
                        <li><span>Ascension</span><strong>{stats.ascensionLevel}</strong></li>
                    )}
                </ul>
            )}

            <div className="run-end__actions">
                <button type="button" className="run-end__button" onClick={onRestart}>
                    {copy.button}
                </button>
                <button type="button" className="run-end__button run-end__button--ghost" onClick={onMainMenu}>
                    Main menu
                </button>
            </div>
        </ModalShell>
    );
};
