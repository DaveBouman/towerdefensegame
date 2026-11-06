import { useEffect } from 'react';
import { ensureAudioUnlocked } from './game/audio/gameAudio';
import { applyStoredDisplayPreset } from './game/desktop/displaySettings';
import { applyStoredWindowMode } from './game/desktop/windowMode';
import { isDesktopShell } from './game/desktop/desktopBridge';
import { GAME_VIEWPORT_ID } from './game/ui/gameViewport';
import { useAutoBattlerController } from './autoBattlerController/useAutoBattlerController';
import { AutoBattlerScreens } from './ui/autoBattler/AutoBattlerScreens';
import { useGameViewportUiScale } from './ui/hooks/useGameViewportUiScale';

function App()
{
    const controller = useAutoBattlerController();
    useGameViewportUiScale();

    useEffect(() =>
    {
        if (!isDesktopShell())
        {
            return;
        }

        void applyStoredDisplayPreset();
        void applyStoredWindowMode();

        const unlock = (): void =>
        {
            void ensureAudioUnlocked();
        };

        window.addEventListener('pointerdown', unlock, { capture: true });
        window.addEventListener('keydown', unlock, { capture: true });

        return () =>
        {
            window.removeEventListener('pointerdown', unlock, { capture: true });
            window.removeEventListener('keydown', unlock, { capture: true });
        };
    }, []);

    return (
        <div
            id="app"
            className={[
                'app--auto-battler',
                `app--ab-${controller.state.phase}`,
            ].join(' ')}
        >
            <div id={GAME_VIEWPORT_ID} className="game-viewport game-viewport--auto-battler">
                <AutoBattlerScreens controller={controller} />
            </div>
        </div>
    );
}

export default App;
