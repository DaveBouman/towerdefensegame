import { EventBus } from '../../game/EventBus';
import {
    TOWER_TARGETING_MODES,
    towerTargetingLabels,
    type TowerTargetingMode,
} from '../../game/combat/towerTargeting';
import { GAME_EVENTS } from '../../game/events/gameEvents';
import type { TowerStateSnapshot } from '../../game/domain/types';

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
        <section className="unit-info-bar__section">
            <h3 className="unit-info-bar__section-title">Target priority</h3>
            <p className="unit-info-bar__hint">
                Applies to enemies in range. Units only move toward nearby threats.
            </p>
            <div className="unit-info-bar__targeting" role="radiogroup" aria-label="Target priority">
                {TOWER_TARGETING_MODES.map((mode) => (
                    <button
                        key={mode}
                        type="button"
                        role="radio"
                        aria-checked={tower.targetingMode === mode}
                        className={
                            tower.targetingMode === mode
                                ? 'unit-info-bar__targeting-btn unit-info-bar__targeting-btn--active'
                                : 'unit-info-bar__targeting-btn'
                        }
                        onClick={() => setMode(mode)}
                    >
                        {towerTargetingLabels[mode]}
                    </button>
                ))}
            </div>
        </section>
    );
};
