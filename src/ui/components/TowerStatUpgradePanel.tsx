import { EventBus } from '../../game/EventBus';
import { GAME_EVENTS } from '../../game/events/gameEvents';
import {
    formatTowerStatUpgradeDelta,
    getTowerStatUpgradeCost,
    getTowerStatUpgradesForArchetype,
} from '../../game/config/towerStatUpgradeCatalog';
import type { TowerStateSnapshot } from '../../game/domain/types';
import { useGameViewModel } from '../viewmodels/useGameViewModel';

type Props = {
    tower: TowerStateSnapshot;
};

export const TowerStatUpgradePanel = ({ tower }: Props) =>
{
    const { gold, canStartWave, upgradePick } = useGameViewModel();
    const betweenWaves = canStartWave && !upgradePick;

    if (!betweenWaves)
    {
        return null;
    }

    const upgrades = getTowerStatUpgradesForArchetype(tower.archetype);

    return (
        <section className="unit-info-bar__section tower-stat-upgrades">
            <h3 className="unit-info-bar__section-title">Between waves</h3>
            <p className="tower-stat-upgrades__hint">Spend gold on this tower only — other towers are unchanged.</p>
            <div className="tower-stat-upgrades__buttons">
                {upgrades.map((def) =>
                {
                    const level = tower.statUpgradeLevels[def.id] ?? 0;
                    const maxed = def.maxLevel !== undefined && level >= def.maxLevel;
                    const cost = getTowerStatUpgradeCost(def, level);
                    const canAfford = gold >= cost;
                    const disabled = maxed || !canAfford;

                    return (
                        <button
                            key={def.id}
                            type="button"
                            className="tower-stat-upgrades__button"
                            disabled={disabled}
                            title={formatTowerStatUpgradeDelta(def)}
                            onClick={() =>
                            {
                                EventBus.emit(GAME_EVENTS.PURCHASE_TOWER_STAT_UPGRADE, {
                                    towerId: tower.id,
                                    upgradeId: def.id,
                                });
                            }}
                        >
                            <span className="tower-stat-upgrades__label">{def.label}</span>
                            <span className="tower-stat-upgrades__level">Lv {level}</span>
                            <span className="tower-stat-upgrades__cost">
                                {maxed ? 'Max' : `${cost}g`}
                            </span>
                        </button>
                    );
                })}
            </div>
        </section>
    );
};
