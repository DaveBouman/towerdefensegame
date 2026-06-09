import { useEffect, useRef, useState } from 'react';
import { EventBus } from '../../game/EventBus';
import { GAME_EVENTS } from '../../game/events/gameEvents';
import type {
    EnemyStateSnapshot,
    PlayerNexusStateSnapshot,
    TowerStateSnapshot,
} from '../../game/domain/types';
import { getTowerDefinitionOrThrow } from '../../game/config/towerCatalog';
import type { TowerDefinitionId } from '../../game/config/towerCatalog';
import { useGameViewModel } from '../viewmodels/useGameViewModel';
import { canManagePlacedTowers } from '../canManagePlacedTowers';
import { TOWER_QUEUE_DRAG_MIME } from '../towerQueueDragMime';
import { phaserColorToCss, setTowerDragImage } from '../towerVisualColor';
import { RACE_BONUS_CONFIG } from '../../game/config/raceBonusCatalog';
import { formatTowerUpgradeStatsTooltip } from '../../game/config/towerUpgradeCatalog';

type NexusHealth = {
    current: number;
    max: number;
};

const useNexusHealth = () =>
{
    const [ player, setPlayer ] = useState<NexusHealth | null>(null);
    const [ enemy, setEnemy ] = useState<NexusHealth | null>(null);
    const pendingPlayerRef = useRef<NexusHealth | null | undefined>(undefined);
    const pendingEnemyRef = useRef<NexusHealth | null | undefined>(undefined);
    const enemyMaxRef = useRef<number | null>(null);

    useEffect(() =>
    {
        const flushIntervalMs = 50; // 20Hz UI updates max.
        let rafId: number | null = null;
        let timerId: ReturnType<typeof setTimeout> | null = null;
        let lastFlushAt = 0;

        const flush = () =>
        {
            if (pendingPlayerRef.current !== undefined)
            {
                setPlayer(pendingPlayerRef.current);
                pendingPlayerRef.current = undefined;
            }

            if (pendingEnemyRef.current !== undefined)
            {
                setEnemy(pendingEnemyRef.current);
                enemyMaxRef.current = pendingEnemyRef.current?.max ?? enemyMaxRef.current;
                pendingEnemyRef.current = undefined;
            }

            lastFlushAt = Date.now();
        };

        const scheduleFlush = () =>
        {
            if (rafId !== null || timerId !== null)
            {
                return;
            }

            const wait = Math.max(0, flushIntervalMs - (Date.now() - lastFlushAt));
            const request = () =>
            {
                rafId = requestAnimationFrame(() =>
                {
                    rafId = null;
                    flush();
                });
            };

            if (wait === 0)
            {
                request();
            }
            else
            {
                timerId = setTimeout(() =>
                {
                    timerId = null;
                    request();
                }, wait);
            }
        };

        const onPlayerSpawned = (snapshot: PlayerNexusStateSnapshot) =>
        {
            pendingPlayerRef.current = { current: snapshot.health, max: snapshot.maxHealth };
            scheduleFlush();
        };

        const onPlayerDamaged = (snapshot: PlayerNexusStateSnapshot) =>
        {
            pendingPlayerRef.current = { current: snapshot.health, max: snapshot.maxHealth };
            scheduleFlush();
        };

        const onEnemyDamaged = (snapshot: EnemyStateSnapshot) =>
        {
            if (!snapshot.isNexus)
            {
                return;
            }

            pendingEnemyRef.current = {
                current: snapshot.health,
                max: pendingEnemyRef.current?.max ?? enemyMaxRef.current ?? snapshot.stats.maxHealth,
            };
            scheduleFlush();
        };

        EventBus.on(GAME_EVENTS.PLAYER_NEXUS_SPAWNED, onPlayerSpawned);
        EventBus.on(GAME_EVENTS.PLAYER_NEXUS_DAMAGED, onPlayerDamaged);
        EventBus.on(GAME_EVENTS.ENEMY_DAMAGED, onEnemyDamaged);

        return () =>
        {
            EventBus.off(GAME_EVENTS.PLAYER_NEXUS_SPAWNED, onPlayerSpawned);
            EventBus.off(GAME_EVENTS.PLAYER_NEXUS_DAMAGED, onPlayerDamaged);
            EventBus.off(GAME_EVENTS.ENEMY_DAMAGED, onEnemyDamaged);

            if (rafId !== null)
            {
                cancelAnimationFrame(rafId);
            }

            if (timerId !== null)
            {
                clearTimeout(timerId);
            }
        };
    }, []);

    return { player, enemy };
};

const useTowerRoster = () =>
{
    const [ towers, setTowers ] = useState<Map<string, TowerStateSnapshot>>(new Map());
    const towersRef = useRef<Map<string, TowerStateSnapshot>>(new Map());

    useEffect(() =>
    {
        const flushIntervalMs = 50; // 20Hz UI updates max.
        let rafId: number | null = null;
        let timerId: ReturnType<typeof setTimeout> | null = null;
        let lastFlushAt = 0;

        const flush = () =>
        {
            lastFlushAt = Date.now();
            setTowers(new Map(towersRef.current));
        };

        const scheduleFlush = () =>
        {
            if (rafId !== null || timerId !== null)
            {
                return;
            }

            const wait = Math.max(0, flushIntervalMs - (Date.now() - lastFlushAt));
            const request = () =>
            {
                rafId = requestAnimationFrame(() =>
                {
                    rafId = null;
                    flush();
                });
            };

            if (wait === 0)
            {
                request();
            }
            else
            {
                timerId = setTimeout(() =>
                {
                    timerId = null;
                    request();
                }, wait);
            }
        };

        const onPlaced = (snapshot: TowerStateSnapshot) =>
        {
            towersRef.current.set(snapshot.id, snapshot);
            scheduleFlush();
        };

        const onDamaged = (snapshot: TowerStateSnapshot) =>
        {
            if (!towersRef.current.has(snapshot.id))
            {
                return;
            }

            towersRef.current.set(snapshot.id, snapshot);
            scheduleFlush();
        };

        const onRemoved = ({ id }: { id: string }) =>
        {
            if (!towersRef.current.has(id))
            {
                return;
            }

            towersRef.current.delete(id);
            scheduleFlush();
        };

        EventBus.on(GAME_EVENTS.TOWER_PLACED, onPlaced);
        EventBus.on(GAME_EVENTS.TOWER_DAMAGED, onDamaged);
        EventBus.on(GAME_EVENTS.TOWER_REMOVED, onRemoved);

        return () =>
        {
            EventBus.off(GAME_EVENTS.TOWER_PLACED, onPlaced);
            EventBus.off(GAME_EVENTS.TOWER_DAMAGED, onDamaged);
            EventBus.off(GAME_EVENTS.TOWER_REMOVED, onRemoved);

            if (rafId !== null)
            {
                cancelAnimationFrame(rafId);
            }

            if (timerId !== null)
            {
                clearTimeout(timerId);
            }
        };
    }, []);

    return Array.from(towers.values());
};

const towerLabel = (tower: TowerStateSnapshot): string =>
{
    const def = getTowerDefinitionOrThrow(tower.definitionId);

    return def.profile.unitType;
};

const formatHp = (current: number, max: number): string =>
    `${Math.max(0, Math.floor(current))}/${Math.floor(max)}`;

const healthPercent = (current: number, max: number): number =>
    max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;

const formatRace = (race: TowerStateSnapshot['race']): string =>
{
    switch (race)
    {
        case 'aether-dominion':
            return 'Aether';
        case 'swarmforge-brood':
            return 'Swarmforge';
        case 'iron-covenant':
            return 'Iron';
    }
};

const synergyLineForTower = (
    towerId: TowerDefinitionId,
    race: TowerStateSnapshot['race'],
): string =>
{
    const parts: string[] = [];
    const same = RACE_BONUS_CONFIG.sameRacePerNeighborBonus[race];

    if (same && Object.keys(same).length > 0)
    {
        parts.push(`Same race: ${formatTowerUpgradeStatsTooltip(same)}`);
    }

    const cross = RACE_BONUS_CONFIG.crossRacePerNeighborBonus
        .filter((rule) => rule.sourceRace === race)
        .map((rule) => `${formatRace(rule.targetRace as TowerStateSnapshot['race'])}: ${formatTowerUpgradeStatsTooltip(rule.bonus)}`);

    if (cross.length > 0)
    {
        parts.push(`Cross race: ${cross.join(' | ')}`);
    }

    const pair = RACE_BONUS_CONFIG.specificPairBonuses
        .filter((rule) => rule.sourceTowerId === towerId)
        .map((rule) =>
            `${rule.targetTowerId}${rule.sameRowOnly ? ' same-row' : ''}: ${formatTowerUpgradeStatsTooltip(rule.bonus)}`,
        );

    if (pair.length > 0)
    {
        parts.push(`Pair: ${pair.join(' | ')}`);
    }

    return parts.join(' || ');
};

export const TowerRosterPanel = () =>
{
    const { deployment, upgradePick, towerDraftPick, canStartWave } = useGameViewModel();
    const { player, enemy } = useNexusHealth();
    const towers = useTowerRoster();
    const canManage = canManagePlacedTowers({ upgradePick, towerDraftPick, canStartWave, deployment });

    const queuedIds: readonly TowerDefinitionId[] = deployment?.queue ?? [];

    return (
        <aside className="tower-roster">
            <section className="tower-roster__section">
                <h3 className="tower-roster__title">Nexuses</h3>
                <div className="tower-roster__health-row">
                    <span className="tower-roster__label">You</span>
                    {player ? (
                        <div className="tower-roster__bar">
                            <div
                                className="tower-roster__bar-fill tower-roster__bar-fill--player"
                                style={{ width: `${healthPercent(player.current, player.max)}%` }}
                            />
                            <span className="tower-roster__bar-text">
                                {formatHp(player.current, player.max)}
                            </span>
                        </div>
                    ) : (
                        <span className="tower-roster__value">—</span>
                    )}
                </div>
                <div className="tower-roster__health-row">
                    <span className="tower-roster__label">Enemy</span>
                    {enemy ? (
                        <div className="tower-roster__bar">
                            <div
                                className="tower-roster__bar-fill tower-roster__bar-fill--enemy"
                                style={{ width: `${healthPercent(enemy.current, enemy.max)}%` }}
                            />
                            <span className="tower-roster__bar-text">
                                {formatHp(enemy.current, enemy.max)}
                            </span>
                        </div>
                    ) : (
                        <span className="tower-roster__value">Hidden</span>
                    )}
                </div>
            </section>

            <section className="tower-roster__section">
                <h3 className="tower-roster__title">Placed towers</h3>
                {towers.length === 0 ? (
                    <p className="tower-roster__empty">No towers placed yet.</p>
                ) : (
                    <ul className="tower-roster__list" aria-label="Placed towers">
                        {towers.map((tower) => (
                            <li key={tower.id} className="tower-roster__item">
                                <span className="tower-roster__item-name">{towerLabel(tower)}</span>
                                <span className="tower-roster__item-meta">
                                    {formatRace(tower.race)} · R{tower.range.toFixed(1)} · {tower.damage.toFixed(0)} dmg
                                </span>
                                <span className="tower-roster__item-meta">
                                    HP {formatHp(tower.health, tower.maxHealth)}
                                </span>
                                <span className="tower-roster__item-meta">
                                    Links: {tower.raceAuraTags.length > 0
                                        ? tower.raceAuraTags.join(', ')
                                        : 'No active links'}
                                </span>
                                {canManage && (
                                    <button
                                        type="button"
                                        className="tower-roster__sell-btn"
                                        onClick={() =>
                                            EventBus.emit(GAME_EVENTS.SELL_TOWER, { towerId: tower.id })
                                        }
                                    >
                                        Sell (+{tower.goldValue})
                                    </button>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            <section className="tower-roster__section">
                <h3 className="tower-roster__title">Upcoming towers</h3>
                <p className="tower-roster__hint">Drag onto the grid to place.</p>
                {queuedIds.length === 0 ? (
                    <p className="tower-roster__empty">No towers queued.</p>
                ) : (
                    <ul className="tower-roster__list" aria-label="Queued towers">
                        {queuedIds.map((id, index) =>
                        {
                            const def = getTowerDefinitionOrThrow(id);

                            return (
                                <li
                                    key={`${id}-${index}`}
                                    className="tower-roster__item tower-roster__item--queued"
                                    draggable
                                    onDragStart={(e) =>
                                    {
                                        e.dataTransfer.effectAllowed = 'copy';
                                        e.dataTransfer.setData(TOWER_QUEUE_DRAG_MIME, id);
                                        e.dataTransfer.setData('text/plain', id);
                                        setTowerDragImage(e, def.profile.color);
                                    }}
                                    onClick={(e) => e.preventDefault()}
                                >
                                    <span
                                        className="tower-roster__unit-icon"
                                        style={{
                                            backgroundColor: phaserColorToCss(def.profile.color),
                                            borderColor: phaserColorToCss(def.profile.color),
                                        }}
                                        aria-hidden="true"
                                    />
                                    <span className="tower-roster__item-name">
                                        {deployment?.nextTowerId === id && index === 0
                                            ? 'Next: '
                                            : null}
                                        {def.profile.unitType}
                                    </span>
                                    <span className="tower-roster__item-meta">
                                        R{def.profile.range.toFixed(1)} ·{' '}
                                        {def.profile.damage.toFixed(0)} dmg
                                    </span>
                                    <span className="tower-roster__item-meta">
                                        Synergy: {synergyLineForTower(id, def.profile.race)}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </section>
        </aside>
    );
};

