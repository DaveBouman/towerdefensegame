import { EventBus } from '../../game/EventBus';
import { GAME_EVENTS } from '../../game/events/gameEvents';
import {
    formatTowerStatUpgradeDelta,
    getTowerStatUpgradeExpCost,
    getTowerStatUpgradesForArchetype,
} from '../../game/config/towerStatUpgradeCatalog';
import type { TowerStateSnapshot } from '../../game/domain/types';
import { canUpgradeUnits } from '../../game/domain/gamePhase';
import { useGameViewModel } from '../viewmodels/useGameViewModel';
import { SidePanel } from './SidePanel';

type Props = {
    tower: TowerStateSnapshot;
};

export const TowerStatUpgradePanel = ({ tower }: Props) =>
{
    const { canStartWave, upgradePick } = useGameViewModel();
    const canUpgrade = canUpgradeUnits({ canStartWave, upgradePick });

    if (!canUpgrade)
    {
        return null;
    }

    const upgrades = getTowerStatUpgradesForArchetype(tower.archetype);

    return (
        <SidePanel.Section>
            <SidePanel.SectionTitle>Between waves</SidePanel.SectionTitle>
            <SidePanel.Hint>
                Spend this unit&apos;s EXP on stats ({tower.experience} EXP available).
            </SidePanel.Hint>
            <div className="tower-stat-upgrades__buttons">
                {upgrades.map((def) =>
                {
                    const level = tower.statUpgradeLevels[def.id] ?? 0;
                    const maxed = def.maxLevel !== undefined && level >= def.maxLevel;
                    const cost = getTowerStatUpgradeExpCost(def, level);
                    const canAfford = tower.experience >= cost;
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
                                {maxed ? 'Max' : `${cost} EXP`}
                            </span>
                        </button>
                    );
                })}
            </div>
        </SidePanel.Section>
    );
};
