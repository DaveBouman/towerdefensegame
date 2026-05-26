import { PhaserGame } from './PhaserGame';
import { GameHud } from './ui/components/GameHud';
import { UnitInfoBar } from './ui/components/UnitInfoBar';
import { WaveUpgradePick } from './ui/components/WaveUpgradePick';
import { InventoryPanel } from './ui/components/InventoryPanel';
import { InventoryPanelProvider } from './ui/context/InventoryPanelContext';

function App()
{
    return (
        <InventoryPanelProvider>
            <div id="app">
                <GameHud />
                <WaveUpgradePick />
                <InventoryPanel />
                <div className="game-stage">
                    <PhaserGame />
                </div>
                <UnitInfoBar />
            </div>
        </InventoryPanelProvider>
    )
}

export default App
