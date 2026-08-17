import { PhaserGame } from './PhaserGame';
import { RunPhaseScreens } from './ui/components/RunPhaseScreens';
import { useRunController } from './runController/useRunController';
import { useEffect } from 'react';
import { ensureAudioUnlocked } from './game/audio/gameAudio';
import { isDesktopShell } from './game/desktop/desktopBridge';

function App()
{
    const controller = useRunController();

    useEffect(() =>
    {
        if (!isDesktopShell())
        {
            return;
        }

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
            <PhaserGame />
            <RunPhaseScreens {...controller} />
        </div>
    );
}

export default App;
