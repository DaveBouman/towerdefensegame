import { useEffect, useState } from 'react';
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
import { TOWER_QUEUE_DRAG_MIME } from '../towerQueueDragMime';

type NexusHealth = {
    current: number;
    max: number;
};

const useNexusHealth = () =>
{
    const [ player, setPlayer ] = useState<NexusHealth | null>(null);
    const [ enemy, setEnemy ] = useState<NexusHealth | null>(null);

    useEffect(() =>
    {
        const onPlayerSpawned = (snapshot: PlayerNexusStateSnapshot) =>
        {
            setPlayer({ current: snapshot.health, max: snapshot.maxHealth });
        };

        const onPlayerDamaged = (snapshot: PlayerNexusStateSnapshot) =>
        {
            setPlayer({ current: snapshot.health, max: snapshot.maxHealth });
        };

        const onEnemyDamaged = (snapshot: EnemyStateSnapshot) =>
        {
            if (!snapshot.isNexus)
            {
                return;
            }

            setEnemy((prev) => ({
                current: snapshot.health,
                max: prev?.max ?? snapshot.stats.maxHealth,
            }));
        };

        EventBus.on(GAME_EVENTS.PLAYER_NEXUS_SPAWNED, onPlayerSpawned);
        EventBus.on(GAME_EVENTS.PLAYER_NEXUS_DAMAGED, onPlayerDamaged);
        EventBus.on(GAME_EVENTS.ENEMY_DAMAGED, onEnemyDamaged);

        return () =>
        {
            EventBus.off(GAME_EVENTS.PLAYER_NEXUS_SPAWNED, onPlayerSpawned);
            EventBus.off(GAME_EVENTS.PLAYER_NEXUS_DAMAGED, onPlayerDamaged);
            EventBus.off(GAME_EVENTS.ENEMY_DAMAGED, onEnemyDamaged);
        };
    }, []);

    return { player, enemy };
};

const useTowerRoster = () =>
{
    const [ towers, setTowers ] = useState<Map<string, TowerStateSnapshot>>(new Map());

    useEffect(() =>
    {
        const onPlaced = (snapshot: TowerStateSnapshot) =>
        {
            setTowers((prev) =>
            {
                const next = new Map(prev);
                next.set(snapshot.id, snapshot);
                return next;
            });
        };

        const onDamaged = (snapshot: TowerStateSnapshot) =>
        {
            setTowers((prev) =>
            {
                if (!prev.has(snapshot.id))
                {
                    return prev;
                }

                const next = new Map(prev);
                next.set(snapshot.id, snapshot);
                return next;
            });
        };

        const onRemoved = ({ id }: { id: string }) =>
        {
            setTowers((prev) =>
            {
                if (!prev.has(id))
                {
                    return prev;
                }

                const next = new Map(prev);
                next.delete(id);
                return next;
            });
        };

        EventBus.on(GAME_EVENTS.TOWER_PLACED, onPlaced);
        EventBus.on(GAME_EVENTS.TOWER_DAMAGED, onDamaged);
        EventBus.on(GAME_EVENTS.TOWER_REMOVED, onRemoved);

        return () =>
        {
            EventBus.off(GAME_EVENTS.TOWER_PLACED, onPlaced);
            EventBus.off(GAME_EVENTS.TOWER_DAMAGED, onDamaged);
            EventBus.off(GAME_EVENTS.TOWER_REMOVED, onRemoved);
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

export const TowerRosterPanel = () =>
{
    const { deployment } = useGameViewModel();
    const { player, enemy } = useNexusHealth();
    const towers = useTowerRoster();

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
                                    R{tower.range.toFixed(1)} · {tower.damage.toFixed(0)} dmg
                                </span>
                                <span className="tower-roster__item-meta">
                                    HP {formatHp(tower.health, tower.maxHealth)}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            <section className="tower-roster__section">
                <h3 className="tower-roster__title">Upcoming towers</h3>
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
                                    }}
                                >
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
                                </li>
                            );
                        })}
                    </ul>
                )}
            </section>
        </aside>
    );
};

