import type { AutoBattlerController } from '../../autoBattlerController/useAutoBattlerController';
import { CyberPanel } from '../components/CyberPanel';

interface RunEndScreenProps {
    controller: AutoBattlerController;
}

export const RunEndScreen = ({ controller }: RunEndScreenProps) =>
{
    const { state, onBackToMenu, onStartRun } = controller;
    const won = state.phase === 'victory';

    return (
        <div className="ab-screen ab-end">
            <CyberPanel variant={won ? 'green' : 'magenta'} className="ab-panel">
                <p className="ab-eyebrow">{won ? 'Circuit cleared' : 'Run failed'}</p>
                <h2 className="ab-title">{won ? 'Victory' : 'Defeat'}</h2>
                <p className="ab-hint">
                    {state.lastMessage}
                    {' '}
                    Wins {state.player.wins} · Lives left {state.player.lives}
                    {state.mode === 'pvp' && state.matchId ? ` · Match ${state.matchId}` : ''}
                </p>
                <footer className="ab-actions">
                    <button type="button" className="ab-btn ab-btn--ghost" onClick={onBackToMenu}>
                        Menu
                    </button>
                    <button type="button" className="ab-btn ab-btn--primary" onClick={onStartRun}>
                        New run
                    </button>
                </footer>
            </CyberPanel>
        </div>
    );
};
