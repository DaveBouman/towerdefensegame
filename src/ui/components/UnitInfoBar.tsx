import type {
    EnemyStateSnapshot,
    PlayerNexusStateSnapshot,
    TowerStateSnapshot,
} from '../../game/domain/types';
import {
    getEnemyPerkTags,
    getEnemyResistanceTags,
    getEnemyStatRows,
} from '../../game/domain/stats/enemyStatDisplay';
import { getPlayerNexusStatRows } from '../../game/domain/stats/playerNexusStatDisplay';
import { getTowerStatRows } from '../../game/domain/stats/towerStatDisplay';
import type { DisplayStat } from '../../game/domain/stats/displayStat';
import { getTowerUpgradeDefinition, towerUpgradeHoverText } from '../../game/config/towerUpgradeCatalog';
import { EventBus } from '../../game/EventBus';
import { GAME_EVENTS } from '../../game/events/gameEvents';
import { canManagePlacedTowers } from '../../game/domain/gamePhase';
import { useInventoryPanel } from '../context/InventoryPanelContext';
import { useGameViewModel } from '../viewmodels/useGameViewModel';
import { useTowerWaveDamageLog } from '../viewmodels/useTowerWaveDamageLog';
import { useUnitSelection } from '../viewmodels/useUnitSelection';
import { SidePanel, SP, type SidePanelAccent } from './SidePanel';
import { TowerControlPanel } from './TowerControlPanel';
import { TowerStatUpgradePanel } from './TowerStatUpgradePanel';

const InventoryIcon = () => (
    <svg
        className={SP.toolIcon}
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

const StatList = ({ stats }: { stats: DisplayStat[] }) => (
    <div className={SP.statGrid}>
        {stats.map((stat) => (
            <div key={stat.label} className={SP.stat}>
                <span className={SP.statLabel}>{stat.label}</span>
                <span className={SP.statValue}>{stat.value}</span>
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
        <SidePanel.Section>
            <SidePanel.SectionTitle>{title}</SidePanel.SectionTitle>
            <ul className={SP.tags}>
                {items.map((item) =>
                {
                    const key = typeof item === 'string' ? item : item.key;
                    const text = typeof item === 'string' ? item : item.text;
                    const tip = typeof item === 'string' ? undefined : item.title;

                    return (
                        <li key={key} className={SP.tag} title={tip}>
                            {text}
                        </li>
                    );
                })}
            </ul>
        </SidePanel.Section>
    );
};

const EnemyDetails = ({ enemy, wave }: { enemy: EnemyStateSnapshot; wave: number }) => (
    <StatList stats={getEnemyStatRows(enemy, wave)} />
);

const EnemyControlPanel = ({ enemy }: { enemy: EnemyStateSnapshot }) => (
    <>
        <TagList title="Resistances" items={getEnemyResistanceTags(enemy)} />
        <TagList title="Perks" items={getEnemyPerkTags(enemy)} />
    </>
);

const towerArchetypeLabel = (archetype: TowerStateSnapshot['archetype']): string =>
    archetype === 'close' ? 'Close range' : 'Long range';

const towerRaceLabel = (race: TowerStateSnapshot['race']): string =>
{
    switch (race)
    {
        case 'aether-dominion':
            return 'Aether Dominion';
        case 'swarmforge-brood':
            return 'Swarmforge Brood';
        case 'iron-covenant':
            return 'Iron Covenant';
    }
};

const PlayerNexusDetails = ({
    nexus,
    wave,
}: {
    nexus: PlayerNexusStateSnapshot;
    wave: number;
}) => <StatList stats={getPlayerNexusStatRows(nexus, wave)} />;

const TowerDetails = ({
    tower,
    canSell,
    lastWaveDamage,
}: {
    tower: TowerStateSnapshot;
    canSell: boolean;
    lastWaveDamage: { wave: number; killExp: number; waveBonusExp: number } | null;
}) => (
    <>
        <p className={SP.subtitle} aria-label="Selected tower">
            {towerRaceLabel(tower.race)} · {towerArchetypeLabel(tower.archetype)} · this tower only
        </p>
        <StatList stats={getTowerStatRows(tower)} />

        {lastWaveDamage && (
            <SidePanel.Section>
                <SidePanel.SectionTitle>Wave {lastWaveDamage.wave} EXP</SidePanel.SectionTitle>
                <div className={SP.statGrid}>
                    <div className={SP.stat}>
                        <span className={SP.statLabel}>Kill EXP</span>
                        <span className={SP.statValue}>{lastWaveDamage.killExp}</span>
                    </div>
                    <div className={SP.stat}>
                        <span className={SP.statLabel}>Wave bonus</span>
                        <span className={SP.statValue}>{lastWaveDamage.waveBonusExp}</span>
                    </div>
                </div>
            </SidePanel.Section>
        )}

        {canSell && (
            <SidePanel.ActionButton
                danger
                onClick={() => EventBus.emit(GAME_EVENTS.SELL_TOWER, { towerId: tower.id })}
            >
                Sell (+{tower.goldValue} gold)
            </SidePanel.ActionButton>
        )}

        <TowerStatUpgradePanel tower={tower} />
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
    </>
);

const selectionAccent = (selection: NonNullable<ReturnType<typeof useUnitSelection>['selection']>): SidePanelAccent =>
{
    if (selection.kind === 'enemy')
    {
        return 'enemy';
    }

    return 'tower';
};

export const UnitInfoBar = () =>
{
    const { selection, clear } = useUnitSelection();
    const { wave, runOutcome, upgradePick, towerDraftPick, canStartWave, deployment } = useGameViewModel();
    const { open: inventoryOpen, toggle: toggleInventory } = useInventoryPanel();
    const { getTowerEntry } = useTowerWaveDamageLog();
    const canSell = canManagePlacedTowers({
        wave,
        runOutcome,
        upgradePick,
        towerDraftPick,
        canStartWave,
        deployment,
    });
    const towerLastWaveDamage = selection?.kind === 'tower'
        ? getTowerEntry(selection.data.id)
        : null;

    return (
        <SidePanel
            side="right"
            accent={selection ? selectionAccent(selection) : 'default'}
            ariaLabel="Unit information"
        >
            <SidePanel.Body aria-hidden={!selection}>
                {selection && (
                    <>
                        <SidePanel.Header>
                            <span className={SP.kind}>{selection.kind}</span>
                            <h2 className={SP.title}>{selection.data.unitType}</h2>
                            <SidePanel.CloseButton
                                onClick={clear}
                                aria-label="Deselect unit"
                            />
                        </SidePanel.Header>

                        <SidePanel.Content>
                            {selection.kind === 'enemy' && (
                                <>
                                    <EnemyDetails enemy={selection.data} wave={wave} />
                                    <EnemyControlPanel enemy={selection.data} />
                                </>
                            )}
                            {selection.kind === 'tower' && (
                                <>
                                    <TowerDetails
                                        tower={selection.data}
                                        canSell={canSell}
                                        lastWaveDamage={towerLastWaveDamage}
                                    />
                                    <TowerControlPanel tower={selection.data} />
                                </>
                            )}
                            {selection.kind === 'playerNexus' && (
                                <PlayerNexusDetails nexus={selection.data} wave={wave} />
                            )}
                        </SidePanel.Content>
                    </>
                )}
            </SidePanel.Body>

            <SidePanel.Footer aria-label="Game tools">
                <SidePanel.ToolButton
                    active={inventoryOpen}
                    onClick={toggleInventory}
                    title="Inventory (I)"
                    aria-label="Inventory"
                    aria-pressed={inventoryOpen}
                >
                    <InventoryIcon />
                    <span className={SP.toolLabel}>Inv</span>
                </SidePanel.ToolButton>
            </SidePanel.Footer>
        </SidePanel>
    );
};
