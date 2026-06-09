import { EventBus } from '../../game/EventBus';
import {
    TOWER_TARGETING_MODES,
    towerTargetingLabels,
    type TowerTargetingMode,
} from '../../game/combat/towerTargeting';
import { GAME_EVENTS } from '../../game/events/gameEvents';
import type { TowerStateSnapshot } from '../../game/domain/types';
import { SidePanel, SP } from './SidePanel';

interface TowerTargetingPanelProps {
    tower: TowerStateSnapshot;
}

export const TowerTargetingPanel = ({ tower }: TowerTargetingPanelProps) =>
{
    const setMode = (mode: TowerTargetingMode) =>
    {
        EventBus.emit(GAME_EVENTS.SET_TOWER_TARGETING_MODE, {
            towerId: tower.id,
            mode,
        });
    };

    return (
        <SidePanel.Section>
            <SidePanel.SectionTitle>Target priority</SidePanel.SectionTitle>
            <SidePanel.Hint>
                Applies to enemies in range. Units only move toward nearby threats.
            </SidePanel.Hint>
            <div className={SP.targetingGrid} role="radiogroup" aria-label="Target priority">
                {TOWER_TARGETING_MODES.map((mode) => (
                    <button
                        key={mode}
                        type="button"
                        role="radio"
                        aria-checked={tower.targetingMode === mode}
                        className={
                            tower.targetingMode === mode
                                ? SP.targetingBtnActive
                                : SP.targetingBtn
                        }
                        onClick={() => setMode(mode)}
                    >
                        {towerTargetingLabels[mode]}
                    </button>
                ))}
            </div>
        </SidePanel.Section>
    );
};
