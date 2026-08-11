import { useMemo } from 'react';
import type { RunMap, RunMapNode } from '../../game/run/runMap';
import { getMapNodeDisplay } from '../../game/run/mapNodeDisplay';
import { NodeKindIcon } from './NodeKindIcon';

const PAD_X = 0.09;
const PAD_Y = 0.16;
const START_X = 0.03;

interface Point { x: number; y: number }

const nodePosition = (map: RunMap, node: RunMapNode): Point =>
{
    const x = PAD_X + (node.row / Math.max(1, map.rows - 1)) * (1 - 2 * PAD_X);
    const y = node.colCount <= 1
        ? 0.5
        : PAD_Y + (node.col / (node.colCount - 1)) * (1 - 2 * PAD_Y);

    return { x: x * 100, y: y * 100 };
};

interface RunMapOverlayProps {
    map: RunMap;
    /** Completed nodes, in the order they were cleared. */
    path: string[];
    availableIds: string[];
    /** Node the player just picked — animates travel before the next screen. */
    departingNodeId?: string | null;
    playerHealth: number;
    maxHealth: number;
    gold: number;
    currentFloor: number;
    floorCount: number;
    floorRerollsRemaining: number;
    floorRerollsMax: number;
    ascensionLevel?: number;
    seed: string;
    onPick: (node: RunMapNode) => void;
}

export const RunMapOverlay = ({
    map,
    path,
    availableIds,
    departingNodeId = null,
    playerHealth,
    maxHealth,
    gold,
    currentFloor,
    floorCount,
    floorRerollsRemaining,
    floorRerollsMax,
    ascensionLevel = 0,
    seed,
    onPick,
}: RunMapOverlayProps) =>
{
    const currentNodeId = path.length > 0 ? path[path.length - 1]! : null;
    const completed = useMemo(() => new Set(path), [ path ]);
    const available = useMemo(() => new Set(availableIds), [ availableIds ]);
    const positions = useMemo(() =>
    {
        const map2 = new Map<string, Point>();
        map.nodes.forEach((node) => map2.set(node.id, nodePosition(map, node)));

        return map2;
    }, [ map ]);

    const travelled = useMemo(() =>
    {
        const set = new Set<string>();

        for (let i = 0; i < path.length - 1; i++)
        {
            set.add(`${path[i]}->${path[i + 1]}`);
        }

        return set;
    }, [ path ]);

    const startPoint: Point = { x: START_X * 100, y: 50 };
    const startEdges = map.nodes.filter((node) => node.row === 0);

    const edgeClass = (fromId: string | null, to: RunMapNode): string =>
    {
        if (departingNodeId && fromId && departingNodeId === to.id && fromId === currentNodeId)
        {
            return 'run-map__edge run-map__edge--departing';
        }

        if (fromId && travelled.has(`${fromId}->${to.id}`))
        {
            return 'run-map__edge run-map__edge--travelled';
        }

        if (fromId === currentNodeId && available.has(to.id))
        {
            return 'run-map__edge run-map__edge--active';
        }

        return 'run-map__edge';
    };

    return (
        <div className="run-map">
            <div className="run-map__header">
                <div className="run-map__heading">
                    <h1 className="run-map__title">Pick Your Route</h1>
                    <div className="run-map__seed">
                        <span className="run-map__seed-label">Seed</span>
                        <code className="run-map__seed-value">{seed}</code>
                    </div>
                </div>
                <div className="run-map__resources">
                    <div className="run-map__health" role="status">
                        <span className="run-map__health-label">Integrity</span>
                        <div className="run-map__health-bar">
                            <div
                                className="run-map__health-fill"
                                style={{ width: `${Math.max(0, Math.min(100, (playerHealth / maxHealth) * 100))}%` }}
                            />
                        </div>
                        <span className="run-map__health-value">{playerHealth}/{maxHealth}</span>
                    </div>
                    <div className="run-map__gold" role="status">
                        <span className="run-map__gold-label">Creds</span>
                        <span className="run-map__gold-value">{gold}</span>
                    </div>
                    <div className="run-map__floor" role="status">
                        <span className="run-map__floor-label">Floor</span>
                        <span className="run-map__floor-value">{currentFloor}/{floorCount}</span>
                    </div>
                    <div className="run-map__rerolls" role="status">
                        <span className="run-map__rerolls-label">Rerolls</span>
                        <span className="run-map__rerolls-value">{floorRerollsRemaining}/{floorRerollsMax}</span>
                    </div>
                    {ascensionLevel > 0 && (
                        <div className="run-map__ascension" role="status">
                            <span className="run-map__ascension-label">Ascension</span>
                            <span className="run-map__ascension-value">{ascensionLevel}</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="run-map__field">
                <svg className="run-map__lines" viewBox="0 0 100 100" preserveAspectRatio="none">
                    {startEdges.map((to) =>
                    {
                        const p = positions.get(to.id)!;

                        return (
                            <line
                                key={`start-${to.id}`}
                                className={edgeClass(null, to)}
                                x1={startPoint.x}
                                y1={startPoint.y}
                                x2={p.x}
                                y2={p.y}
                            />
                        );
                    })}
                    {map.nodes.flatMap((node) =>
                        node.nextIds.map((nextId) =>
                        {
                            const from = positions.get(node.id)!;
                            const to = positions.get(nextId)!;
                            const target = map.nodes.find((n) => n.id === nextId)!;

                            return (
                                <line
                                    key={`${node.id}->${nextId}`}
                                    className={edgeClass(node.id, target)}
                                    x1={from.x}
                                    y1={from.y}
                                    x2={to.x}
                                    y2={to.y}
                                />
                            );
                        }),
                    )}
                </svg>

                <div
                    className="run-map__node run-map__node--start"
                    style={{ left: `${startPoint.x}%`, top: `${startPoint.y}%` }}
                >
                    <span className="run-map__node-dot" />
                    <span className="run-map__node-label">Start</span>
                </div>

                {map.nodes.map((node) =>
                {
                    const pos = positions.get(node.id)!;
                    const isCompleted = completed.has(node.id);
                    const isAvailable = available.has(node.id);
                    const isCurrent = node.id === currentNodeId;
                    const { label, tooltipTitle, tooltipBody } = getMapNodeDisplay(node);
                    const classes = [ 'run-map__node', `run-map__node--${node.kind}` ];

                    if (isCompleted) classes.push('run-map__node--completed');
                    if (isCurrent) classes.push('run-map__node--current');
                    if (isAvailable) classes.push('run-map__node--available');
                    if (node.id === departingNodeId) classes.push('run-map__node--departing');
                    if (!isAvailable && !isCompleted && !isCurrent) classes.push('run-map__node--locked');

                    return (
                        <button
                            key={node.id}
                            type="button"
                            className={classes.join(' ')}
                            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                            aria-disabled={!isAvailable}
                            onClick={() =>
                            {
                                if (isAvailable)
                                {
                                    onPick(node);
                                }
                            }}
                        >
                            <span className="run-map__node-dot">
                                <NodeKindIcon kind={node.kind} className="run-map__node-icon" />
                            </span>
                            <span className="run-map__node-label">{label}</span>
                            <span className="run-map__tooltip" role="tooltip">
                                <span className="run-map__tooltip-title">{tooltipTitle}</span>
                                <span className="run-map__tooltip-body">{tooltipBody}</span>
                            </span>
                        </button>
                    );
                })}
            </div>

            <p className="run-map__hint">
                Select a glowing node to enter the next battle. Your vitality carries between fights.
            </p>
        </div>
    );
};
