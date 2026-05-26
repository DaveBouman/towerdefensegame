import { EventBus } from '../../game/EventBus';
import { GAME_EVENTS } from '../../game/events/gameEvents';
import {
    formatTowerUpgradeStatsTooltip,
    getTowerUpgradeDefinition,
} from '../../game/config/towerUpgradeCatalog';
import { useGameViewModel } from '../viewmodels/useGameViewModel';

export const WaveUpgradePick = () =>
{
    const { upgradePick } = useGameViewModel();

    if (!upgradePick || upgradePick.choices.length === 0)
    {
        return null;
    }

    return (
        <div
            className="wave-upgrade-pick"
            role="dialog"
            aria-modal="true"
            aria-labelledby="wave-upgrade-pick-title"
        >
            <div className="wave-upgrade-pick__panel">
                <h2 id="wave-upgrade-pick-title" className="wave-upgrade-pick__title">
                    Wave cleared — pick an upgrade
                </h2>
                <p className="wave-upgrade-pick__hint">Applied to your close-range tower.</p>
                <div className="wave-upgrade-pick__choices">
                    {upgradePick.choices.map((id) =>
                    {
                        const def = getTowerUpgradeDefinition(id);

                        if (!def)
                        {
                            return null;
                        }

                        const stats = formatTowerUpgradeStatsTooltip(def.modifiers);

                        return (
                            <button
                                key={id}
                                type="button"
                                className="wave-upgrade-pick__choice"
                                title={stats}
                                onClick={() => EventBus.emit(GAME_EVENTS.PICK_WAVE_UPGRADE, { upgradeId: id })}
                            >
                                <span className="wave-upgrade-pick__choice-name">{def.name}</span>
                                <span className="wave-upgrade-pick__choice-stats">{stats.replace(/\n/g, ' · ')}</span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
