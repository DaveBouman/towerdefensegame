import { PhaserGame } from './PhaserGame';
import { RunPhaseScreens } from './ui/components/RunPhaseScreens';
import { useRunController } from './runController/useRunController';
import { useEffect } from 'react';
import { ensureAudioUnlocked } from './game/audio/gameAudio';
import { applyStoredDisplayPreset } from './game/desktop/displaySettings';
import { isDesktopShell } from './game/desktop/desktopBridge';
import { GAME_VIEWPORT_ID } from './game/ui/gameViewport';

function App()
{
    const controller = useRunController();

    useEffect(() =>
    {
        if (!isDesktopShell())
        {
            return;
        }

        void applyStoredDisplayPreset();

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
                controller.appPhaseClass,
                controller.lowHealth && controller.phase !== 'victory' && controller.phase !== 'defeat'
                    ? 'app--low-hp'
                    : '',
            ].filter(Boolean).join(' ') || undefined}
        >
            <div id={GAME_VIEWPORT_ID} className="game-viewport">
                <PhaserGame />
                <RunPhaseScreens {...controller} />
            </div>
        </div>
    );
}

export default App;
