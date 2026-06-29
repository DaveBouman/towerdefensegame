import { PhaserGame } from './PhaserGame';
import { GameHud } from './ui/components/GameHud';

function App()
{
    return (
        <div id="app">
            <GameHud />
            <PhaserGame />
        </div>
    );
}

export default App;
