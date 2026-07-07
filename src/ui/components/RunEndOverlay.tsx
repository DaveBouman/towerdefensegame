interface RunEndOverlayProps {
    variant: 'victory' | 'defeat';
    onRestart: () => void;
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

export const RunEndOverlay = ({ variant, onRestart }: RunEndOverlayProps) =>
{
    const copy = COPY[variant];

    return (
        <div className={`run-end run-end--${variant}`}>
            <div className="run-end__panel">
                <p className="run-end__eyebrow">{copy.eyebrow}</p>
                <h1 className="run-end__title">{copy.title}</h1>
                <p className="run-end__summary">{copy.summary}</p>
                <button type="button" className="run-end__button" onClick={onRestart}>
                    {copy.button}
                </button>
            </div>
        </div>
    );
};
