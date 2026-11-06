import type { AutoBattlerController } from '../../autoBattlerController/useAutoBattlerController';
import { CyberPanel } from '../components/CyberPanel';

interface RunEndScreenProps {
    controller: AutoBattlerController;
}

export const RunEndScreen = ({ controller }: RunEndScreenProps) =>
{
    const {
        state,
        onBackToMenu,
        onStartRun,
        onQueuePvp,
        onRematchLast,
    } = controller;
    const won = state.phase === 'victory';
    const online = state.mode === 'pvp';

    return (
        <div className="ab-screen ab-end">
            <CyberPanel variant={won ? 'green' : 'magenta'} className="ab-panel">
                <p className="ab-eyebrow">{won ? 'Circuit cleared' : 'Run failed'}</p>
                <h2 className="ab-title">{won ? 'Victory' : 'Defeat'}</h2>
                <p className="ab-hint">
                    {state.lastMessage}
                    {' '}
                    Wins {state.player.wins} · Lives left {state.player.lives}
                </p>
                <footer className="ab-actions ab-actions--stack">
                    {!won && online && state.canRematchLast ? (
                        <button type="button" className="ab-btn ab-btn--primary" onClick={onRematchLast}>
                            Rematch last saved lineup
                        </button>
                    ) : null}
                    {online ? (
                        <button type="button" className="ab-btn ab-btn--ghost" onClick={onQueuePvp}>
                            New opponent
                        </button>
                    ) : (
                        <button type="button" className="ab-btn ab-btn--primary" onClick={onStartRun}>
                            New run vs AI
                        </button>
                    )}
                    <button type="button" className="ab-btn ab-btn--ghost" onClick={onBackToMenu}>
                        Menu
                    </button>
                </footer>
            </CyberPanel>
        </div>
    );
};
