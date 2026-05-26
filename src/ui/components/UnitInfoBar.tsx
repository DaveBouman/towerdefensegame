import type { EnemyStateSnapshot, TowerStateSnapshot } from '../../game/domain/types';
import {
    getEnemyPerkTags,
    getEnemyResistanceTags,
    getEnemyStatRows,
} from '../../game/domain/stats/enemyStatDisplay';
import { getTowerStatRows } from '../../game/domain/stats/towerStatDisplay';
import type { DisplayStat } from '../../game/domain/stats/displayStat';
import { getTowerUpgradeDefinition, towerUpgradeHoverText } from '../../game/config/towerUpgradeCatalog';
import { useInventoryPanel } from '../context/InventoryPanelContext';
import { useUnitSelection } from '../viewmodels/useUnitSelection';

const InventoryIcon = () => (
    <svg
        className="unit-info-bar__tool-icon"
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
    >
        <path
            fill="currentColor"
            d="M20 7h-3V6a4 4 0 0 0-8 0v1H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2Zm-9-1a2 2 0 0 1 4 0v1h-4V6Zm2 10a2 2 0 1 1 0-4 2 2 0 0 1 0 4Z"
        />
    </svg>
);

const formatLabel = (key: string) => key.charAt(0).toUpperCase() + key.slice(1);

const StatList = ({ stats }: { stats: DisplayStat[] }) => (
    <div className="unit-info-bar__stats">
        {stats.map((stat) => (
            <div key={stat.label} className="unit-info-bar__stat">
                <span className="unit-info-bar__stat-label">{stat.label}</span>
                <span className="unit-info-bar__stat-value">{stat.value}</span>
            </div>
        ))}
    </div>
);

type TagItem = string | { key: string; text: string; title?: string };

const TagList = ({ title, items }: { title: string; items: readonly TagItem[] }) =>
{
    if (items.length === 0)
    {
        return null;
    }

    return (
        <section className="unit-info-bar__section">
            <h3 className="unit-info-bar__section-title">{title}</h3>
            <ul className="unit-info-bar__tags">
                {items.map((item) =>
                {
                    const key = typeof item === 'string' ? item : item.key;
                    const text = typeof item === 'string' ? item : item.text;
                    const tip = typeof item === 'string' ? undefined : item.title;

                    return (
                        <li
                            key={key}
                            className="unit-info-bar__tag"
                            title={tip}
                        >
                            {text}
                        </li>
                    );
                })}
            </ul>
        </section>
    );
};

const EnemyDetails = ({ enemy }: { enemy: EnemyStateSnapshot }) => (
    <>
        <StatList stats={getEnemyStatRows(enemy)} />

        <div className="unit-info-bar__extra">
            <TagList title="Resistances" items={getEnemyResistanceTags(enemy)} />
            <TagList title="Perks" items={getEnemyPerkTags(enemy)} />
            <TagList title="Weaknesses" items={[]} />
        </div>
    </>
);

const TowerDetails = ({ tower }: { tower: TowerStateSnapshot }) => (
    <>
        <StatList stats={getTowerStatRows(tower)} />

        <div className="unit-info-bar__extra">
            <TagList
                title="Upgrades"
                items={tower.equippedUpgrades.map((u) =>
                {
                    const def = getTowerUpgradeDefinition(u.id);

                    return {
                        key: u.id,
                        text: u.name,
                        title: def ? towerUpgradeHoverText(def) : u.name,
                    };
                })}
            />
            <TagList
                title="Weaknesses"
                items={tower.weaknesses.map((w) => formatLabel(w))}
            />
        </div>
    </>
);

export const UnitInfoBar = () =>
{
    const { selection, clear } = useUnitSelection();
    const { open: inventoryOpen, toggle: toggleInventory } = useInventoryPanel();

    const accentClass = !selection
        ? 'unit-info-bar--empty'
        : selection.kind === 'enemy'
            ? 'unit-info-bar--enemy'
            : 'unit-info-bar--tower';

    return (
        <footer
            className={`unit-info-bar ${accentClass}`}
            role="region"
            aria-label="Unit information"
        >
            <div className="unit-info-bar__main" aria-hidden={!selection}>
                <div className="unit-info-bar__identity">
                    {selection && (
                        <>
                            <span className="unit-info-bar__kind">{selection.kind}</span>
                            <h2 className="unit-info-bar__name">{selection.data.unitType}</h2>
                        </>
                    )}
                </div>

                <div className="unit-info-bar__content">
                    {selection?.kind === 'enemy' && <EnemyDetails enemy={selection.data} />}
                    {selection?.kind === 'tower' && <TowerDetails tower={selection.data} />}
                </div>

                {selection && (
                    <button
                        type="button"
                        className="unit-info-bar__close"
                        onClick={clear}
                        aria-label="Deselect unit"
                    >
                        ×
                    </button>
                )}
            </div>

            <nav className="unit-info-bar__tools" aria-label="Game tools">
                <button
                    type="button"
                    className={`unit-info-bar__tool${inventoryOpen ? ' unit-info-bar__tool--active' : ''}`}
                    onClick={toggleInventory}
                    title="Inventory (H)"
                    aria-label="Inventory"
                    aria-pressed={inventoryOpen}
                >
                    <InventoryIcon />
                    <span className="unit-info-bar__tool-label">Inv</span>
                </button>
            </nav>
        </footer>
    );
};
