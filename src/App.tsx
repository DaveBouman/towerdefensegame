import { PhaserGame } from './PhaserGame';
import { GameHud } from './ui/components/GameHud';

function App()
{
    return (
        <div id="app">
            <PhaserGame />
            <GameHud />
        </div>
    );
}

export default App;
