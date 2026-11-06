import type { AutoBattlerController } from '../../autoBattlerController/useAutoBattlerController';
import { GAME_BUILD_LABEL, GAME_TITLE, GAME_VERSION } from '../../game/meta/gameMeta';
import { CyberPanel } from '../components/CyberPanel';

interface MenuScreenProps {
    controller: AutoBattlerController;
}

export const MenuScreen = ({ controller }: MenuScreenProps) =>
{
    const connected = controller.status === 'connected';

    return (
        <div className="ab-screen ab-menu">
            <CyberPanel variant="gold" className="ab-panel ab-panel--menu">
                <p className="ab-eyebrow">{GAME_BUILD_LABEL} · v{GAME_VERSION}</p>
                <h1 className="ab-brand">{GAME_TITLE}</h1>
                <p className="ab-tagline">
                    Authoritative auto battler — shop locally feels snappy, but gold, RNG, and battles
                    resolve on the server so clients cannot invent wins.
                </p>
                <p className={`ab-conn ab-conn--${controller.status}`}>
                    Server: {controller.status}
                    {controller.statusDetail ? ` — ${controller.statusDetail}` : ''}
                </p>
                <ul className="ab-bullets">
                    <li>Thin client — intents only; no local sim authority</li>
                    <li>End turn saves your run — others can fight that save later</li>
                    <li>Only same run depth matches (Turn 4 never fights Turn 1)</li>
                </ul>
                <div className="ab-actions ab-actions--stack">
                    <button
                        type="button"
                        className="ab-btn ab-btn--primary ab-btn--wide"
                        disabled={!connected}
                        onClick={controller.onStartRun}
                    >
                        Start run vs AI
                    </button>
                    <button
                        type="button"
                        className="ab-btn ab-btn--ghost ab-btn--wide"
                        disabled={!connected}
                        onClick={controller.onQueuePvp}
                    >
                        Play online
                    </button>
                    {!connected ? (
                        <button
                            type="button"
                            className="ab-btn ab-btn--ghost ab-btn--wide"
                            onClick={controller.onReconnect}
                        >
                            Reconnect
                        </button>
                    ) : null}
                </div>
            </CyberPanel>
        </div>
    );
};
