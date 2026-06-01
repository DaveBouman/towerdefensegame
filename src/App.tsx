import { PhaserGame } from './PhaserGame';
import { GameHud } from './ui/components/GameHud';
import { UnitInfoBar } from './ui/components/UnitInfoBar';
import { InventoryPanel } from './ui/components/InventoryPanel';
import { TowerDraftPick } from './ui/components/TowerDraftPick';
import { InventoryPanelProvider } from './ui/context/InventoryPanelContext';

function App()
{
    return (
        <InventoryPanelProvider>
            <div id="app">
                <TowerDraftPick />
                <GameHud />
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
