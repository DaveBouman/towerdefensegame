import { useGameViewModel } from '../viewmodels/useGameViewModel';

export const VictoryScreen = () =>
{
    const { runOutcome, wave, lives } = useGameViewModel();

    if (runOutcome !== 'victory')
    {
        return null;
    }

    return (
        <div
            className="victory-screen"
            role="dialog"
            aria-modal="true"
            aria-labelledby="victory-screen-title"
        >
            <div className="victory-screen__panel">
                <p className="victory-screen__eyebrow">Enemy nexus destroyed</p>
                <h2 id="victory-screen-title" className="victory-screen__title">
                    You Win!
                </h2>
                <p className="victory-screen__summary">
                    Wave {wave} cleared with {lives} nexus HP remaining.
                </p>
                <button
                    type="button"
                    className="victory-screen__restart"
                    onClick={() => window.location.reload()}
                >
                    Play again
                </button>
            </div>
        </div>
    );
};
