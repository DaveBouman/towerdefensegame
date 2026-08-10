import { CyberPanelChrome } from './CyberPanel';

interface RunEndOverlayProps {
    variant: 'victory' | 'defeat';
    clutch?: boolean;
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
    onRestart,
    onMainMenu,
}: RunEndOverlayProps) =>
{
    const copy = COPY[variant];
    const panelVariant = variant === 'victory' ? 'green' : 'magenta';

    return (
        <div className={`run-end run-end--${variant}${clutch ? ' run-end--clutch' : ''}`}>
            <div className="cp-overlay__backdrop" aria-hidden="true" />
            <div className={`run-end__panel cp-panel cp-panel--${panelVariant}`}>
                <CyberPanelChrome variant={panelVariant} />
                {clutch && variant === 'victory' && (
                    <p className="run-end__clutch">Clutch clear — you limped out at critical integrity.</p>
                )}
                <p className="run-end__eyebrow">{copy.eyebrow}</p>
                <h1 className="run-end__title">{copy.title}</h1>
                <p className="run-end__summary">{copy.summary}</p>
                <div className="run-end__actions">
                    <button type="button" className="run-end__button" onClick={onRestart}>
                        {copy.button}
                    </button>
                    <button type="button" className="run-end__button run-end__button--ghost" onClick={onMainMenu}>
                        Main menu
                    </button>
                </div>
            </div>
        </div>
    );
};
