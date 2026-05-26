import { formatTowerUpgradeStatsTooltip } from '../../game/config/towerUpgradeCatalog';
import { useInventoryPanel } from '../context/InventoryPanelContext';

export const InventoryPanel = () =>
{
    const { open, items } = useInventoryPanel();

    if (!open)
    {
        return null;
    }

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
                <p className="inventory-panel__hint">
                    Upgrades not equipped on any tower yet. Press H or use the sidebar to close.
                </p>
                {items.length === 0 ? (
                    <p className="inventory-panel__empty">Nothing unused in the catalog.</p>
                ) : (
                    <ul className="inventory-panel__list">
                        {items.map((def) =>
                        {
                            const stats = formatTowerUpgradeStatsTooltip(def.modifiers);

                            return (
                                <li key={def.id} className="inventory-panel__item" title={stats}>
                                    <span className="inventory-panel__name">{def.name}</span>
                                    <span className="inventory-panel__stats">{stats.replace(/\n/g, ' · ')}</span>
                                    {def.description && (
                                        <span className="inventory-panel__desc">{def.description}</span>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </div>
    );
};
