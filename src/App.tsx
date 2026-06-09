import { PhaserGame } from './PhaserGame';
import { GameHud } from './ui/components/GameHud';
import { TowerRosterPanel } from './ui/components/TowerRosterPanel';
import { UnitInfoBar } from './ui/components/UnitInfoBar';
import { InventoryPanel } from './ui/components/InventoryPanel';
import { TowerDraftPick } from './ui/components/TowerDraftPick';
import { WaveDamageRecap } from './ui/components/WaveDamageRecap';
import { VictoryScreen } from './ui/components/VictoryScreen';
import { InventoryPanelProvider } from './ui/context/InventoryPanelContext';

function App()
{
    return (
        <InventoryPanelProvider>
            <div id="app">
                <TowerDraftPick />
                <WaveDamageRecap />
                <VictoryScreen />
                <GameHud />
                <div className="app-main">
                    <TowerRosterPanel />
                    <div className="game-stage">
                        <PhaserGame />
                    </div>
                    <UnitInfoBar />
                </div>
                <InventoryPanel />
            </div>
        </InventoryPanelProvider>
    )
}

export default App
