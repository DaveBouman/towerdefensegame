import type { AutoBattlerController } from '../../autoBattlerController/useAutoBattlerController';
import { CyberPanel } from '../components/CyberPanel';

interface WaitingScreenProps {
    controller: AutoBattlerController;
}

export const WaitingScreen = ({ controller }: WaitingScreenProps) =>
{
    const { state, onCancelQueue } = controller;
    const turn = state.player.turn;

    return (
        <div className="ab-screen ab-waiting">
            <CyberPanel variant="cyan" className="ab-panel ab-panel--menu">
                <p className="ab-eyebrow">Matchmaking</p>
                <h2 className="ab-title">Turn {turn}</h2>
                <p className="ab-hint">
                    {state.lastMessage || `Waiting for another player on Turn ${turn}…`}
                </p>
                <p className="ab-tagline">
                    Async matchmaking: you fight a Turn {turn} lineup snapshot. That player is not pulled into your fight.
                </p>
                <button
                    type="button"
                    className="ab-btn ab-btn--ghost ab-btn--wide"
                    onClick={onCancelQueue}
                >
                    Cancel wait (back to shop)
                </button>
            </CyberPanel>
        </div>
    );
};
