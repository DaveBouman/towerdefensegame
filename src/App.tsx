import { PhaserGame } from './PhaserGame';
import { RunPhaseScreens } from './ui/components/RunPhaseScreens';
import { useRunController } from './runController/useRunController';

function App()
{
    const controller = useRunController();

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
