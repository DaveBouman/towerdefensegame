import { useEffect, useState } from 'react';
import {
    formatTowerUpgradeStatsTooltip,
    getTowerUpgradeDefinition,
} from '../../game/config/towerUpgradeCatalog';
import { EventBus } from '../../game/EventBus';
import { GAME_EVENTS } from '../../game/events/gameEvents';
import { useInventoryPanel } from '../context/InventoryPanelContext';
import { INVENTORY_UPGRADE_DRAG_MIME } from '../inventoryDragMime';
import { beginInventoryDrag, endInventoryDrag } from '../inventoryDragSession';
import { useGameViewModel } from '../viewmodels/useGameViewModel';

export const InventoryPanel = () =>
{
    const { open, items } = useInventoryPanel();
    const { upgradePick } = useGameViewModel();
    const [ selectedRewardId, setSelectedRewardId ] = useState<string | null>(null);

    useEffect(() =>
    {
        setSelectedRewardId(null);
    }, [ upgradePick ]);

    if (!open)
    {
        return null;
    }

    const rewardChoices = upgradePick?.choices ?? [];
    const showRewardStep = rewardChoices.length > 0;

    const confirmReward = (): void =>
    {
        if (!selectedRewardId || !rewardChoices.includes(selectedRewardId))
        {
            return;
        }

        EventBus.emit(GAME_EVENTS.CLAIM_WAVE_REWARD, { upgradeId: selectedRewardId });
    };

    return (
        <div
            className="inventory-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="inventory-title"
        >
            <div className="inventory-panel__panel">
                <h2 id="inventory-title" className="inventory-panel__title">
                    Inventory
                </h2>

                {showRewardStep ? (
                    <section className="inventory-panel__reward" aria-labelledby="inventory-reward-title">
                        <h3 id="inventory-reward-title" className="inventory-panel__reward-title">
                            Wave reward
                        </h3>
                        <p className="inventory-panel__hint">
                            Pick one upgrade to keep, then drag it onto any tower below.
                        </p>
                        <div className="inventory-panel__reward-choices">
                            {rewardChoices.map((id) =>
                            {
                                const def = getTowerUpgradeDefinition(id);

                                if (!def)
                                {
                                    return null;
                                }

                                const stats = formatTowerUpgradeStatsTooltip(def.modifiers);
                                const isSelected = selectedRewardId === id;

                                return (
                                    <button
                                        key={id}
                                        type="button"
                                        className={`inventory-panel__reward-choice${isSelected ? ' inventory-panel__reward-choice--selected' : ''}`}
                                        title={stats}
                                        aria-pressed={isSelected}
                                        onClick={() => setSelectedRewardId(id)}
                                    >
                                        <span className="inventory-panel__name">{def.name}</span>
                                        <span className="inventory-panel__stats">{stats.replace(/\n/g, ' · ')}</span>
                                    </button>
                                );
                            })}
                        </div>
                        <button
                            type="button"
                            className="inventory-panel__reward-confirm"
                            disabled={!selectedRewardId}
                            onClick={confirmReward}
                        >
                            Keep reward
                        </button>
                    </section>
                ) : (
                    <p className="inventory-panel__hint">
                        Drag an upgrade onto a tower on the map to equip it. Press H or the sidebar button to close.
                    </p>
                )}

                {!showRewardStep && items.length === 0 ? (
                    <p className="inventory-panel__empty">No upgrades waiting to be equipped.</p>
                ) : !showRewardStep ? (
                    <ul className="inventory-panel__list">
                        {items.map((def) =>
                        {
                            const stats = formatTowerUpgradeStatsTooltip(def.modifiers);

                            return (
                                <li
                                    key={def.id}
                                    className="inventory-panel__item"
                                    title={stats}
                                    draggable
                                    onDragStart={(e) =>
                                    {
                                        beginInventoryDrag(def.id);
                                        e.dataTransfer.setData(INVENTORY_UPGRADE_DRAG_MIME, def.id);
                                        e.dataTransfer.setData('text/plain', def.id);
                                        e.dataTransfer.effectAllowed = 'copy';
                                    }}
                                    onDragEnd={() =>
                                    {
                                        endInventoryDrag();
                                    }}
                                >
                                    <span className="inventory-panel__name">{def.name}</span>
                                    <span className="inventory-panel__stats">{stats.replace(/\n/g, ' · ')}</span>
                                    {def.description && (
                                        <span className="inventory-panel__desc">{def.description}</span>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                ) : null}
            </div>
        </div>
    );
};
